-- Generated from pg_dump via scripts/dump-schemas; edit freely — this file is
-- the canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.get_member_decks(p_today_start timestamp with time zone) RETURNS TABLE(id bigint, created_at timestamp with time zone, updated_at timestamp with time zone, description text, is_public boolean, title text, member_id uuid, member_display_name text, tags text[], has_image boolean, study_config jsonb, cover_config jsonb, card_attributes jsonb, card_count integer, reviewed_today_count integer, new_reviewed_today_count integer, due_count integer, rank numeric, review_pacing_preset_id bigint, desired_retention integer, learning_steps text[], relearning_steps text[], desired_retention_override integer, learning_steps_override text[], relearning_steps_override text[], max_reviews_per_day integer, max_new_per_day integer, has_max_reviews_override boolean, max_reviews_per_day_override integer, has_max_new_override boolean, max_new_per_day_override integer)
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
    dp.max_new_per_day_override

  FROM public.decks d
  LEFT JOIN public.members m ON m.id = d.member_id
  LEFT JOIN public.deck_review_pacing dp ON dp.deck_id = d.id
  LEFT JOIN public.review_pacing_presets p ON p.id = dp.review_pacing_preset_id
  CROSS JOIN (
    SELECT desired_retention, learning_steps, relearning_steps, max_reviews_per_day, max_new_per_day
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
$$;


ALTER FUNCTION public.get_member_decks(p_today_start timestamp with time zone) OWNER TO postgres;


GRANT ALL ON FUNCTION public.get_member_decks(p_today_start timestamp with time zone) TO anon;
GRANT ALL ON FUNCTION public.get_member_decks(p_today_start timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.get_member_decks(p_today_start timestamp with time zone) TO service_role;

