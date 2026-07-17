-- Hand-organized declarative schema (by domain). Edit freely — this file is the
-- canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

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
