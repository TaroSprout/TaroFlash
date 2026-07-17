-- Hand-organized declarative schema (by domain). Edit freely — this file is the
-- canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.get_study_session_cards(p_deck_id bigint, p_today_start timestamp with time zone, p_study_all boolean DEFAULT false) RETURNS SETOF public.cards_with_images
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

  -- Read caps. NULL = unlimited. Same override -> preset -> system ladder
  -- as get_member_decks: a linked preset's own NULL means "that preset says
  -- unlimited", which is why this checks "is a preset linked" (dp/p present)
  -- rather than COALESCE-ing straight through a possibly-NULL preset value.
  SELECT
    CASE
      WHEN dp.has_max_reviews_override THEN dp.max_reviews_per_day_override
      WHEN p.id IS NOT NULL THEN p.max_reviews_per_day
      ELSE sys.max_reviews_per_day
    END,
    CASE
      WHEN dp.has_max_new_override THEN dp.max_new_per_day_override
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


ALTER FUNCTION public.get_study_session_cards(p_deck_id bigint, p_today_start timestamp with time zone, p_study_all boolean) OWNER TO postgres;


GRANT ALL ON FUNCTION public.get_study_session_cards(p_deck_id bigint, p_today_start timestamp with time zone, p_study_all boolean) TO anon;
GRANT ALL ON FUNCTION public.get_study_session_cards(p_deck_id bigint, p_today_start timestamp with time zone, p_study_all boolean) TO authenticated;
GRANT ALL ON FUNCTION public.get_study_session_cards(p_deck_id bigint, p_today_start timestamp with time zone, p_study_all boolean) TO service_role;
