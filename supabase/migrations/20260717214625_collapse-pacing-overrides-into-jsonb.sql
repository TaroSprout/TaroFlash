-- Collapse the ten per-field pacing override columns on deck_review_pacing into
-- a single `overrides jsonb` bag. Key present = the deck pins that field (value
-- may be null, e.g. max_interval null = "uncapped"); key absent = follow the
-- linked preset. This kills every has_*_override boolean: a value column plus a
-- boolean gate was only ever needed to tell "not overridden" (null) apart from
-- "overridden to uncapped" (also null) — jsonb key-presence makes that
-- distinction directly, so cap fields resolve on the same ladder as everything
-- else and the COALESCE-vs-CASE split in the read RPCs disappears.
--
-- migra can't generate a data backfill, and its statement order (drop columns
-- before adding the bag; drop member_deck before the functions that depend on
-- it) is wrong, so this migration is hand-ordered: add + backfill + drop
-- columns, then drop/recreate the type and its dependent functions.

SET check_function_bodies = false;

-- 1. Add the bag, backfill it from the old columns, then drop them.
ALTER TABLE public.deck_review_pacing ADD COLUMN overrides jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Concatenate one conditional chunk per field. Value fields key when non-null.
-- Cap fields key when their has_*_override was set — carrying a null cap through
-- as `{"key": null}` preserves a pinned-uncapped override (key present, null
-- value), which is exactly the state the old boolean existed to record.
UPDATE public.deck_review_pacing SET overrides =
       CASE WHEN desired_retention_override IS NOT NULL
            THEN jsonb_build_object('desired_retention', desired_retention_override) ELSE '{}'::jsonb END
    || CASE WHEN learning_steps_override IS NOT NULL
            THEN jsonb_build_object('learning_steps', to_jsonb(learning_steps_override)) ELSE '{}'::jsonb END
    || CASE WHEN relearning_steps_override IS NOT NULL
            THEN jsonb_build_object('relearning_steps', to_jsonb(relearning_steps_override)) ELSE '{}'::jsonb END
    || CASE WHEN leech_threshold_override IS NOT NULL
            THEN jsonb_build_object('leech_threshold', leech_threshold_override) ELSE '{}'::jsonb END
    || CASE WHEN has_max_reviews_override
            THEN jsonb_build_object('max_reviews_per_day', max_reviews_per_day_override) ELSE '{}'::jsonb END
    || CASE WHEN has_max_new_override
            THEN jsonb_build_object('max_new_per_day', max_new_per_day_override) ELSE '{}'::jsonb END
    || CASE WHEN has_max_interval_override
            THEN jsonb_build_object('max_interval', max_interval_override) ELSE '{}'::jsonb END;

ALTER TABLE public.deck_review_pacing
  DROP COLUMN desired_retention_override,
  DROP COLUMN learning_steps_override,
  DROP COLUMN relearning_steps_override,
  DROP COLUMN has_max_reviews_override,
  DROP COLUMN max_reviews_per_day_override,
  DROP COLUMN has_max_new_override,
  DROP COLUMN max_new_per_day_override,
  DROP COLUMN leech_threshold_override,
  DROP COLUMN has_max_interval_override,
  DROP COLUMN max_interval_override;

-- 2. Recreate the member_deck composite type with the ten override/has_* fields
-- replaced by one pacing_overrides jsonb. Both read RPCs return SETOF this type,
-- so they must be dropped before the type can be, then recreated against it.
DROP FUNCTION IF EXISTS public.save_deck(p_deck_id bigint, p_title text, p_description text, p_is_public boolean, p_study_config jsonb, p_cover_config jsonb, p_card_attributes jsonb, p_review_pacing_preset_id bigint, p_desired_retention_override integer, p_learning_steps_override text[], p_relearning_steps_override text[], p_has_max_reviews_override boolean, p_max_reviews_per_day_override integer, p_has_max_new_override boolean, p_max_new_per_day_override integer, p_leech_threshold_override integer, p_has_max_interval_override boolean, p_max_interval_override integer);

DROP FUNCTION IF EXISTS public.get_member_decks(p_today_start timestamp with time zone);

DROP TYPE public.member_deck;

CREATE TYPE public.member_deck AS (
    id                            bigint,
    created_at                    timestamp with time zone,
    updated_at                    timestamp with time zone,
    description                   text,
    is_public                     boolean,
    title                         text,
    member_id                     uuid,
    member_display_name           text,
    tags                          text[],
    has_image                     boolean,
    study_config                  jsonb,
    cover_config                  jsonb,
    card_attributes               jsonb,
    card_count                    integer,
    reviewed_today_count          integer,
    new_reviewed_today_count      integer,
    due_count                     integer,
    rank                          numeric,
    review_pacing_preset_id       bigint,
    desired_retention             integer,
    learning_steps                text[],
    relearning_steps              text[],
    max_reviews_per_day           integer,
    max_new_per_day               integer,
    leech_threshold               integer,
    max_interval                  integer,
    pacing_overrides              jsonb
);

ALTER TYPE public.member_deck OWNER TO postgres;

-- 3. Read RPC — uniform resolution ladder for every pacing field.
CREATE FUNCTION public.get_member_decks(p_today_start timestamp with time zone) RETURNS SETOF public.member_deck
    LANGUAGE sql STABLE
    AS $$
  SELECT
    d.id,
    d.created_at,
    d.updated_at,
    d.description,
    d.is_public,
    d.title,
    d.member_id,
    m.display_name AS member_display_name,
    d.tags,
    d.has_image,
    d.study_config,
    d.cover_config,
    d.card_attributes,

    (
      SELECT count(*)::int
      FROM public.cards c
      WHERE c.deck_id = d.id
    ) AS card_count,

    stats.reviewed_today_count,
    stats.new_reviewed_today_count,

    -- new_take + review_take, matching get_study_session_cards exactly.
    -- COALESCE(cap - used, INT_MAX) treats a NULL cap as unbounded.
    GREATEST(
      0,
      LEAST(stats.new_available, stats.remaining_new, stats.remaining_total)
    )
    + GREATEST(
      0,
      LEAST(
        stats.review_available,
        stats.remaining_total
          - GREATEST(0, LEAST(stats.new_available, stats.remaining_new, stats.remaining_total))
      )
    ) AS due_count,

    d.rank,

    dp.review_pacing_preset_id,

    -- One uniform resolution ladder for every pacing field now that overrides
    -- are key-presence in a jsonb bag: pinned override (`?` = key present, so a
    -- pinned null resolves to null/uncapped) -> linked preset -> system default.
    -- This subsumes the old COALESCE-vs-CASE split — a null cap value pinned in
    -- overrides is unambiguous where a null column once needed a has_* boolean.
    CASE
      WHEN dp.overrides ? 'desired_retention' THEN (dp.overrides->>'desired_retention')::int
      WHEN p.id IS NOT NULL THEN p.desired_retention
      ELSE sys.desired_retention
    END AS desired_retention,
    CASE
      WHEN dp.overrides ? 'learning_steps' THEN ARRAY(SELECT jsonb_array_elements_text(dp.overrides->'learning_steps'))
      WHEN p.id IS NOT NULL THEN p.learning_steps
      ELSE sys.learning_steps
    END AS learning_steps,
    CASE
      WHEN dp.overrides ? 'relearning_steps' THEN ARRAY(SELECT jsonb_array_elements_text(dp.overrides->'relearning_steps'))
      WHEN p.id IS NOT NULL THEN p.relearning_steps
      ELSE sys.relearning_steps
    END AS relearning_steps,
    CASE
      WHEN dp.overrides ? 'max_reviews_per_day' THEN (dp.overrides->>'max_reviews_per_day')::int
      WHEN p.id IS NOT NULL THEN p.max_reviews_per_day
      ELSE sys.max_reviews_per_day
    END AS max_reviews_per_day,
    CASE
      WHEN dp.overrides ? 'max_new_per_day' THEN (dp.overrides->>'max_new_per_day')::int
      WHEN p.id IS NOT NULL THEN p.max_new_per_day
      ELSE sys.max_new_per_day
    END AS max_new_per_day,
    CASE
      WHEN dp.overrides ? 'leech_threshold' THEN (dp.overrides->>'leech_threshold')::int
      WHEN p.id IS NOT NULL THEN p.leech_threshold
      ELSE sys.leech_threshold
    END AS leech_threshold,
    CASE
      WHEN dp.overrides ? 'max_interval' THEN (dp.overrides->>'max_interval')::int
      WHEN p.id IS NOT NULL THEN p.max_interval
      ELSE sys.max_interval
    END AS max_interval,

    dp.overrides AS pacing_overrides

  FROM public.decks d
  LEFT JOIN public.members m ON m.id = d.member_id
  LEFT JOIN public.deck_review_pacing dp ON dp.deck_id = d.id
  LEFT JOIN public.review_pacing_presets p ON p.id = dp.review_pacing_preset_id
  CROSS JOIN (
    SELECT desired_retention, learning_steps, relearning_steps, max_reviews_per_day, max_new_per_day, leech_threshold, max_interval
    FROM public.review_pacing_presets
    WHERE is_system
    LIMIT 1
  ) sys
  CROSS JOIN LATERAL (
    SELECT
      (
        SELECT count(DISTINCT rl.card_id)::int
        FROM public.review_logs rl
        JOIN public.cards c ON c.id = rl.card_id
        WHERE c.deck_id = d.id
          AND rl.review >= p_today_start
      ) AS reviewed_today_count,

      (
        SELECT count(DISTINCT rl.card_id)::int
        FROM public.review_logs rl
        JOIN public.cards c ON c.id = rl.card_id
        WHERE c.deck_id = d.id
          AND rl.state = 0
          AND rl.review >= p_today_start
      ) AS new_reviewed_today_count,

      -- Cards with no reviews row at all = brand-new.
      (
        SELECT count(*)::int
        FROM public.cards c
        LEFT JOIN public.reviews r ON r.card_id = c.id
        WHERE c.deck_id = d.id
          AND r.id IS NULL
      ) AS new_available,

      -- Cards with a reviews row whose due date has passed.
      (
        SELECT count(*)::int
        FROM public.cards c
        JOIN public.reviews r ON r.card_id = c.id
        WHERE c.deck_id = d.id
          AND r.due <= now()
      ) AS review_available,

      GREATEST(
        0,
        COALESCE(
          (
            CASE
              WHEN dp.overrides ? 'max_reviews_per_day' THEN (dp.overrides->>'max_reviews_per_day')::int
              WHEN p.id IS NOT NULL THEN p.max_reviews_per_day
              ELSE sys.max_reviews_per_day
            END
          ) - (
            SELECT count(DISTINCT rl.card_id)::int
            FROM public.review_logs rl
            JOIN public.cards c ON c.id = rl.card_id
            WHERE c.deck_id = d.id
              AND rl.review >= p_today_start
          ),
          2147483647
        )
      ) AS remaining_total,

      GREATEST(
        0,
        COALESCE(
          (
            CASE
              WHEN dp.overrides ? 'max_new_per_day' THEN (dp.overrides->>'max_new_per_day')::int
              WHEN p.id IS NOT NULL THEN p.max_new_per_day
              ELSE sys.max_new_per_day
            END
          ) - (
            SELECT count(DISTINCT rl.card_id)::int
            FROM public.review_logs rl
            JOIN public.cards c ON c.id = rl.card_id
            WHERE c.deck_id = d.id
              AND rl.state = 0
              AND rl.review >= p_today_start
          ),
          2147483647
        )
      ) AS remaining_new
  ) AS stats;
$$;

ALTER FUNCTION public.get_member_decks(p_today_start timestamp with time zone) OWNER TO postgres;

GRANT ALL ON FUNCTION public.get_member_decks(p_today_start timestamp with time zone) TO anon;
GRANT ALL ON FUNCTION public.get_member_decks(p_today_start timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.get_member_decks(p_today_start timestamp with time zone) TO service_role;

-- 4. Write RPC — 9 params; sidecar stores the preset link + overrides bag.
CREATE FUNCTION public.save_deck(p_deck_id bigint, p_title text, p_description text, p_is_public boolean, p_study_config jsonb, p_cover_config jsonb, p_card_attributes jsonb, p_review_pacing_preset_id bigint, p_pacing_overrides jsonb) RETURNS SETOF public.member_deck
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_deck_id bigint;
BEGIN
  IF p_deck_id IS NULL THEN
    INSERT INTO public.decks (title, description, is_public, study_config, cover_config, card_attributes)
    VALUES (p_title, p_description, p_is_public, p_study_config, p_cover_config, p_card_attributes)
    RETURNING decks.id INTO v_deck_id;
  ELSE
    UPDATE public.decks
    SET title = p_title,
        description = p_description,
        is_public = p_is_public,
        study_config = p_study_config,
        cover_config = p_cover_config,
        card_attributes = p_card_attributes,
        updated_at = now()
    WHERE decks.id = p_deck_id
    RETURNING decks.id INTO v_deck_id;

    IF v_deck_id IS NULL THEN
      RAISE EXCEPTION 'deck % not found or not owned by caller', p_deck_id;
    END IF;
  END IF;

  -- Sidecar carries just the preset link + the overrides bag now; every
  -- per-field override/has_* column collapsed into p_pacing_overrides.
  INSERT INTO public.deck_review_pacing (deck_id, review_pacing_preset_id, overrides)
  VALUES (v_deck_id, p_review_pacing_preset_id, COALESCE(p_pacing_overrides, '{}'::jsonb))
  ON CONFLICT (deck_id) DO UPDATE SET
    review_pacing_preset_id = EXCLUDED.review_pacing_preset_id,
    overrides = EXCLUDED.overrides;

  RETURN QUERY SELECT * FROM public.get_member_decks(now()) gmd WHERE gmd.id = v_deck_id;
END;
$$;

ALTER FUNCTION public.save_deck(p_deck_id bigint, p_title text, p_description text, p_is_public boolean, p_study_config jsonb, p_cover_config jsonb, p_card_attributes jsonb, p_review_pacing_preset_id bigint, p_pacing_overrides jsonb) OWNER TO postgres;

GRANT ALL ON FUNCTION public.save_deck(p_deck_id bigint, p_title text, p_description text, p_is_public boolean, p_study_config jsonb, p_cover_config jsonb, p_card_attributes jsonb, p_review_pacing_preset_id bigint, p_pacing_overrides jsonb) TO anon;
GRANT ALL ON FUNCTION public.save_deck(p_deck_id bigint, p_title text, p_description text, p_is_public boolean, p_study_config jsonb, p_cover_config jsonb, p_card_attributes jsonb, p_review_pacing_preset_id bigint, p_pacing_overrides jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.save_deck(p_deck_id bigint, p_title text, p_description text, p_is_public boolean, p_study_config jsonb, p_cover_config jsonb, p_card_attributes jsonb, p_review_pacing_preset_id bigint, p_pacing_overrides jsonb) TO service_role;

-- 5. Study-session cap read — same key-presence ladder for the two daily limits.
CREATE OR REPLACE FUNCTION public.get_study_session_cards(p_deck_id bigint, p_today_start timestamp with time zone, p_study_all boolean DEFAULT false) RETURNS SETOF public.cards_with_images
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
  v_max_total       int;
  v_max_new         int;
  v_used_total      int;
  v_used_new        int;
  v_remaining_total int;
  v_remaining_new   int;
  v_new_available   int;
  v_new_take        int;
  v_review_take     int;
BEGIN
  -- study_all bypasses caps + due filter — return every card in rank order.
  IF p_study_all THEN
    RETURN QUERY
    SELECT cwi.*
    FROM public.cards_with_images cwi
    WHERE cwi.deck_id = p_deck_id
    ORDER BY cwi.rank;
    RETURN;
  END IF;

  -- Read caps. NULL = unlimited. Same override -> preset -> system ladder as
  -- get_member_decks: `overrides ? '<key>'` (key present) means the deck pins
  -- that cap, and a pinned null there is unambiguously "uncapped" — no has_*
  -- boolean needed. A linked preset's own NULL still means "preset says
  -- unlimited", which is why an absent key falls to the preset, not straight
  -- COALESCE through a possibly-NULL preset value.
  SELECT
    CASE
      WHEN dp.overrides ? 'max_reviews_per_day' THEN (dp.overrides->>'max_reviews_per_day')::int
      WHEN p.id IS NOT NULL THEN p.max_reviews_per_day
      ELSE sys.max_reviews_per_day
    END,
    CASE
      WHEN dp.overrides ? 'max_new_per_day' THEN (dp.overrides->>'max_new_per_day')::int
      WHEN p.id IS NOT NULL THEN p.max_new_per_day
      ELSE sys.max_new_per_day
    END
  INTO v_max_total, v_max_new
  FROM public.decks d
  LEFT JOIN public.deck_review_pacing dp ON dp.deck_id = d.id
  LEFT JOIN public.review_pacing_presets p ON p.id = dp.review_pacing_preset_id
  CROSS JOIN (
    SELECT max_reviews_per_day, max_new_per_day
    FROM public.review_pacing_presets
    WHERE is_system
    LIMIT 1
  ) sys
  WHERE d.id = p_deck_id;

  -- Today's usage: distinct cards reviewed since the member's local midnight.
  SELECT
    count(DISTINCT rl.card_id)::int,
    count(DISTINCT rl.card_id) FILTER (WHERE rl.state = 0)::int
  INTO v_used_total, v_used_new
  FROM public.review_logs rl
  JOIN public.cards c ON c.id = rl.card_id
  WHERE c.deck_id = p_deck_id
    AND rl.review >= p_today_start;

  -- Remaining budget. NULL cap → sentinel large int meaning unlimited.
  v_remaining_total := GREATEST(0, COALESCE(v_max_total - v_used_total, 2147483647));
  v_remaining_new   := GREATEST(0, COALESCE(v_max_new   - v_used_new,   2147483647));

  -- How many new cards exist in this deck (no review row yet).
  SELECT count(*)::int
  INTO v_new_available
  FROM public.cards c
  LEFT JOIN public.reviews r ON r.card_id = c.id
  WHERE c.deck_id = p_deck_id
    AND r.id IS NULL;

  -- New cards drawn first for budget purposes; review cards fill the rest.
  -- (This only decides *how many* of each — final ordering interleaves them.)
  v_new_take    := LEAST(v_new_available, v_remaining_new, v_remaining_total);
  v_review_take := GREATEST(0, v_remaining_total - v_new_take);

  RETURN QUERY
  WITH new_queue AS (
    -- row_number() OVER (ORDER BY c.rank) numbers each row 1..v_new_take in
    -- rank order, without collapsing rows the way an aggregate would.
    SELECT c.id, 1 AS bucket, row_number() OVER (ORDER BY c.rank) AS rn
    FROM public.cards c
    LEFT JOIN public.reviews r ON r.card_id = c.id
    WHERE c.deck_id = p_deck_id
      AND r.id IS NULL
    ORDER BY c.rank
    LIMIT v_new_take
  ),
  review_queue AS (
    -- Most-overdue-first: order by due ASC (oldest due date = most overdue),
    -- not rank. rank only breaks ties between cards due at the same instant.
    SELECT c.id, 2 AS bucket, row_number() OVER (ORDER BY r.due ASC, c.rank) AS rn
    FROM public.cards c
    JOIN public.reviews r ON r.card_id = c.id
    WHERE c.deck_id = p_deck_id
      AND r.due <= now()
    ORDER BY r.due ASC, c.rank
    LIMIT v_review_take
  ),
  queue AS (
    -- Proportional interleave: each bucket's row gets a key in (0, 1] based
    -- on its position within that bucket alone (e.g. new card 2 of 5 → 0.3).
    -- Sorting all rows by that shared key spreads new cards evenly through
    -- the review cards instead of grouping all of one bucket before the other.
    SELECT id, bucket, (rn - 0.5) / NULLIF(v_new_take, 0) AS interleave_key
    FROM new_queue
    UNION ALL
    SELECT id, bucket, (rn - 0.5) / NULLIF(v_review_take, 0) AS interleave_key
    FROM review_queue
  )
  SELECT cwi.*
  FROM public.cards_with_images cwi
  JOIN queue q ON q.id = cwi.id
  ORDER BY q.interleave_key, q.bucket;
END;
$$;
