-- =============================================================================
-- get_member_decks: due_count respects max_new_per_day + max_reviews_per_day
-- =============================================================================
-- Covers the cap interaction that was missing from the original implementation:
--   • new-card pool clamped by max_new_per_day
--   • total clamped by max_reviews_per_day
--   • caps consume from today's already-reviewed counts (remaining = cap - used)
--   • no caps → raw pool
-- Caps now live on the deck_review_pacing sidecar (has_max_*_override +
-- max_*_per_day_override), not decks.study_config.
-- =============================================================================

BEGIN;

SELECT plan(5);

SELECT tests.create_user('11111111-1111-1111-1111-111111111111'::uuid, 'alice_caps');

SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
SET LOCAL role = 'authenticated';

-- Four decks, each with 20 brand-new cards and zero reviews/log rows.
INSERT INTO public.decks (id, title, is_public) VALUES
  (9700, 'No caps',           false),
  (9701, 'New cap only',      false),
  (9702, 'Total cap only',    false),
  (9703, 'Both caps',         false);

INSERT INTO public.deck_review_pacing (deck_id, has_max_new_override, max_new_per_day_override)
VALUES (9701, true, 5);

INSERT INTO public.deck_review_pacing (deck_id, has_max_reviews_override, max_reviews_per_day_override)
VALUES (9702, true, 7);

INSERT INTO public.deck_review_pacing (
  deck_id, has_max_new_override, max_new_per_day_override,
  has_max_reviews_override, max_reviews_per_day_override
) VALUES (9703, true, 5, true, 12);

INSERT INTO public.cards (deck_id, front_text, back_text, rank)
SELECT d.id, 'Q' || gs, 'A' || gs, gs * 1000
FROM (VALUES (9700), (9701), (9702), (9703)) AS d(id)
CROSS JOIN generate_series(1, 20) AS gs;

-- ── Assertions ────────────────────────────────────────────────────────────────

-- Test 1: no caps → all 20 new cards are reported due.
SELECT is(
  (SELECT due_count
     FROM public.get_member_decks(date_trunc('day', now()))
    WHERE id = 9700),
  20,
  'no caps → due_count equals the raw new-card pool'
);

-- Test 2: max_new_per_day = 5 → clamps new bucket to 5; no review bucket → 5.
SELECT is(
  (SELECT due_count
     FROM public.get_member_decks(date_trunc('day', now()))
    WHERE id = 9701),
  5,
  'max_new_per_day caps the new-card contribution'
);

-- Test 3: max_reviews_per_day = 7 → total cap dominates the unbounded new pool.
SELECT is(
  (SELECT due_count
     FROM public.get_member_decks(date_trunc('day', now()))
    WHERE id = 9702),
  7,
  'max_reviews_per_day caps the total even when new-cap is unset'
);

-- Test 4: both caps; new sub-cap is smaller and there is no review bucket,
-- so due_count = LEAST(new_cap, total_cap) = 5.
SELECT is(
  (SELECT due_count
     FROM public.get_member_decks(date_trunc('day', now()))
    WHERE id = 9703),
  5,
  'with both caps and only new cards available, due_count = max_new_per_day'
);

-- Test 5: simulate having already used 3 of the 5 new slots today by logging
-- 3 state=0 reviews. remaining_new = 2, so due_count drops from 5 to 2.
INSERT INTO public.reviews (card_id, member_id, due, stability, difficulty)
SELECT c.id, '11111111-1111-1111-1111-111111111111'::uuid, now() + interval '7 days', 1.0, 5.0
FROM public.cards c
WHERE c.deck_id = 9701
ORDER BY c.rank
LIMIT 3;

INSERT INTO public.review_logs (card_id, member_id, rating, state, due, stability, difficulty, scheduled_days, review)
SELECT c.id, '11111111-1111-1111-1111-111111111111'::uuid, 3, 0, now(), 1.0, 5.0, 1, now()
FROM public.cards c
WHERE c.deck_id = 9701
ORDER BY c.rank
LIMIT 3;

SELECT is(
  (SELECT due_count
     FROM public.get_member_decks(date_trunc('day', now()))
    WHERE id = 9701),
  2,
  'remaining_new = max_new_per_day - new_reviewed_today_count'
);

SELECT * FROM finish();
ROLLBACK;
