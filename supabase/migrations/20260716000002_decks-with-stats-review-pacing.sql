-- decks_with_stats: surface each deck's resolved review-pacing fields
-- (desired retention + learning/relearning steps), so every existing Deck
-- fetch already carries the values the study session needs — no separate
-- fetch required at session-start time.
--
-- Resolution ladder per field: the deck's own *_override column -> linked
-- preset's value -> system preset's value. The *_override columns are
-- surfaced as-is (not collapsed into one boolean) so the frontend can tell
-- which individual field is pinned without re-deriving it by comparing
-- against preset data — the whole point of resolving here is that the
-- client never has to. Adding output columns is a signature change —
-- CREATE OR REPLACE can't do it, so DROP + CREATE (same rule as insert_card_at).

BEGIN;

DROP FUNCTION IF EXISTS public.decks_with_stats(timestamptz);

CREATE FUNCTION public.decks_with_stats(p_today_start timestamptz)
RETURNS TABLE (
  id                          bigint,
  created_at                  timestamptz,
  updated_at                  timestamptz,
  description                 text,
  is_public                   boolean,
  title                       text,
  member_id                   uuid,
  member_display_name         text,
  tags                        text[],
  has_image                   boolean,
  study_config                jsonb,
  cover_config                jsonb,
  card_attributes             jsonb,
  card_count                  int,
  reviewed_today_count        int,
  new_reviewed_today_count    int,
  due_count                   int,
  rank                        numeric,
  review_pacing_preset_id     bigint,
  desired_retention           integer,
  learning_steps              text[],
  relearning_steps            text[],
  desired_retention_override  integer,
  learning_steps_override     text[],
  relearning_steps_override   text[]
)
LANGUAGE sql
SECURITY INVOKER
STABLE
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

    d.review_pacing_preset_id,
    COALESCE(d.desired_retention_override, p.desired_retention, sys.desired_retention) AS desired_retention,
    COALESCE(d.learning_steps_override, p.learning_steps, sys.learning_steps) AS learning_steps,
    COALESCE(d.relearning_steps_override, p.relearning_steps, sys.relearning_steps) AS relearning_steps,
    d.desired_retention_override,
    d.learning_steps_override,
    d.relearning_steps_override

  FROM public.decks d
  LEFT JOIN public.members m ON m.id = d.member_id
  LEFT JOIN public.review_pacing_presets p ON p.id = d.review_pacing_preset_id
  CROSS JOIN (
    SELECT desired_retention, learning_steps, relearning_steps
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
          (d.study_config->>'max_reviews_per_day')::int
            - (
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
          (d.study_config->>'max_new_per_day')::int
            - (
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

GRANT EXECUTE ON FUNCTION public.decks_with_stats(timestamptz) TO authenticated;

COMMIT;
