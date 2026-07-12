-- =============================================================================
-- decks_with_stats: surface the new decks.rank column.
--
-- Adding an output column to RETURNS TABLE is a signature change — CREATE OR
-- REPLACE can't do it, so DROP + CREATE (same rule as insert_card_at).
-- =============================================================================

BEGIN;

DROP FUNCTION public.decks_with_stats(timestamptz);

CREATE FUNCTION public.decks_with_stats(p_today_start timestamptz)
RETURNS TABLE (
  id                       bigint,
  created_at               timestamptz,
  updated_at               timestamptz,
  description              text,
  is_public                boolean,
  title                    text,
  member_id                uuid,
  member_display_name      text,
  tags                     text[],
  has_image                boolean,
  study_config             jsonb,
  cover_config              jsonb,
  card_attributes           jsonb,
  card_count                int,
  reviewed_today_count      int,
  new_reviewed_today_count  int,
  due_count                 int,
  rank                      numeric
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

    d.rank

  FROM public.decks d
  LEFT JOIN public.members m ON m.id = d.member_id
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
