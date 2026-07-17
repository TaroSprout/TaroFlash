drop function if exists "public"."save_deck"(p_deck_id bigint, p_title text, p_description text, p_is_public boolean, p_study_config jsonb, p_cover_config jsonb, p_card_attributes jsonb, p_review_pacing_preset_id bigint, p_desired_retention_override integer, p_learning_steps_override text[], p_relearning_steps_override text[], p_has_max_reviews_override boolean, p_max_reviews_per_day_override integer, p_has_max_new_override boolean, p_max_new_per_day_override integer);

drop function if exists "public"."get_member_decks"(p_today_start timestamp with time zone);

alter table "public"."deck_review_pacing" add column "has_max_interval_override" boolean not null default false;

alter table "public"."deck_review_pacing" add column "leech_threshold_override" integer;

alter table "public"."deck_review_pacing" add column "max_interval_override" integer;

alter table "public"."review_pacing_presets" add column "leech_threshold" integer not null default 8;

alter table "public"."review_pacing_presets" add column "max_interval" integer;

set check_function_bodies = off;

create type "public"."member_deck" as ("id" bigint, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "description" text, "is_public" boolean, "title" text, "member_id" uuid, "member_display_name" text, "tags" text[], "has_image" boolean, "study_config" jsonb, "cover_config" jsonb, "card_attributes" jsonb, "card_count" integer, "reviewed_today_count" integer, "new_reviewed_today_count" integer, "due_count" integer, "rank" numeric, "review_pacing_preset_id" bigint, "desired_retention" integer, "learning_steps" text[], "relearning_steps" text[], "desired_retention_override" integer, "learning_steps_override" text[], "relearning_steps_override" text[], "max_reviews_per_day" integer, "max_new_per_day" integer, "has_max_reviews_override" boolean, "max_reviews_per_day_override" integer, "has_max_new_override" boolean, "max_new_per_day_override" integer, "leech_threshold" integer, "max_interval" integer, "leech_threshold_override" integer, "has_max_interval_override" boolean, "max_interval_override" integer);

CREATE OR REPLACE FUNCTION public.save_deck(p_deck_id bigint, p_title text, p_description text, p_is_public boolean, p_study_config jsonb, p_cover_config jsonb, p_card_attributes jsonb, p_review_pacing_preset_id bigint, p_desired_retention_override integer, p_learning_steps_override text[], p_relearning_steps_override text[], p_has_max_reviews_override boolean, p_max_reviews_per_day_override integer, p_has_max_new_override boolean, p_max_new_per_day_override integer, p_leech_threshold_override integer, p_has_max_interval_override boolean, p_max_interval_override integer)
 RETURNS SETOF public.member_deck
 LANGUAGE plpgsql
AS $function$
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

  INSERT INTO public.deck_review_pacing (
    deck_id, review_pacing_preset_id, desired_retention_override, learning_steps_override, relearning_steps_override,
    has_max_reviews_override, max_reviews_per_day_override, has_max_new_override, max_new_per_day_override,
    leech_threshold_override, has_max_interval_override, max_interval_override
  )
  VALUES (
    v_deck_id, p_review_pacing_preset_id, p_desired_retention_override, p_learning_steps_override, p_relearning_steps_override,
    p_has_max_reviews_override, p_max_reviews_per_day_override, p_has_max_new_override, p_max_new_per_day_override,
    p_leech_threshold_override, p_has_max_interval_override, p_max_interval_override
  )
  ON CONFLICT (deck_id) DO UPDATE SET
    review_pacing_preset_id = EXCLUDED.review_pacing_preset_id,
    desired_retention_override = EXCLUDED.desired_retention_override,
    learning_steps_override = EXCLUDED.learning_steps_override,
    relearning_steps_override = EXCLUDED.relearning_steps_override,
    has_max_reviews_override = EXCLUDED.has_max_reviews_override,
    max_reviews_per_day_override = EXCLUDED.max_reviews_per_day_override,
    has_max_new_override = EXCLUDED.has_max_new_override,
    max_new_per_day_override = EXCLUDED.max_new_per_day_override,
    leech_threshold_override = EXCLUDED.leech_threshold_override,
    has_max_interval_override = EXCLUDED.has_max_interval_override,
    max_interval_override = EXCLUDED.max_interval_override;

  RETURN QUERY SELECT * FROM public.get_member_decks(now()) gmd WHERE gmd.id = v_deck_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_member_decks(p_today_start timestamp with time zone)
 RETURNS SETOF public.member_deck
 LANGUAGE sql
 STABLE
AS $function$
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
    COALESCE(dp.desired_retention_override, p.desired_retention, sys.desired_retention) AS desired_retention,
    COALESCE(dp.learning_steps_override, p.learning_steps, sys.learning_steps) AS learning_steps,
    COALESCE(dp.relearning_steps_override, p.relearning_steps, sys.relearning_steps) AS relearning_steps,
    dp.desired_retention_override,
    dp.learning_steps_override,
    dp.relearning_steps_override,

    CASE
      WHEN dp.has_max_reviews_override THEN dp.max_reviews_per_day_override
      WHEN p.id IS NOT NULL THEN p.max_reviews_per_day
      ELSE sys.max_reviews_per_day
    END AS max_reviews_per_day,
    CASE
      WHEN dp.has_max_new_override THEN dp.max_new_per_day_override
      WHEN p.id IS NOT NULL THEN p.max_new_per_day
      ELSE sys.max_new_per_day
    END AS max_new_per_day,
    COALESCE(dp.has_max_reviews_override, false),
    dp.max_reviews_per_day_override,
    COALESCE(dp.has_max_new_override, false),
    dp.max_new_per_day_override,

    -- leech_threshold is a plain NOT NULL preset value (like desired_retention):
    -- override -> linked preset -> system, no "unbounded" case to gate.
    COALESCE(dp.leech_threshold_override, p.leech_threshold, sys.leech_threshold) AS leech_threshold,
    -- max_interval carries the same three-state shape as the daily limits: a
    -- preset's max_interval is nullable (null = uncapped), so a null override is
    -- ambiguous — the has_max_interval_override boolean says whether it's set.
    CASE
      WHEN dp.has_max_interval_override THEN dp.max_interval_override
      WHEN p.id IS NOT NULL THEN p.max_interval
      ELSE sys.max_interval
    END AS max_interval,
    dp.leech_threshold_override,
    COALESCE(dp.has_max_interval_override, false),
    dp.max_interval_override

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
              WHEN dp.has_max_reviews_override THEN dp.max_reviews_per_day_override
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
              WHEN dp.has_max_new_override THEN dp.max_new_per_day_override
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
$function$
;


