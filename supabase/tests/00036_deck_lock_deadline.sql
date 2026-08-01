-- =============================================================================
-- deck_lock_deadline(): rank-derived lock boundary, live reorder, and the
-- get_member_decks() dashboard projection built on top of it.
--
-- Covers [obligation]:
--   1. For an over-limit free member with a deadline, the top deck_limit
--      decks by rank are unlocked and every deck beyond is locked.
--   2. Reorder is live: moving a locked deck above the limit line unlocks it
--      and locks the displaced deck, with no write to the lock state itself
--      (only decks.rank changes — downgrade_delete_at is untouched).
--   3. A deck unlocked this way keeps its FSRS review data intact — unlock
--      is purely derived, it never touches reviews.
--   4. get_member_decks() reports is_locked / locked_delete_at / due_count
--      correctly for both a locked and an unlocked deck.
-- =============================================================================

BEGIN;

SELECT plan(12);

-- ── Setup (as postgres superuser) ─────────────────────────────────────────────

SELECT tests.create_user('e0000000-0000-0000-0000-00000000c001'::uuid, 'lock_erin');

-- 12 decks, inserted in id order so rank ascends 600 < 601 < ... < 611
-- (set_deck_rank assigns +1000 per insert when rank is omitted).
SELECT tests.set_claims('e0000000-0000-0000-0000-00000000c001'::uuid);
SET LOCAL role = 'authenticated';

INSERT INTO public.decks (id, title, is_public) VALUES
  (600, 'Erin deck 600', false),
  (601, 'Erin deck 601', false),
  (602, 'Erin deck 602', false),
  (603, 'Erin deck 603', false),
  (604, 'Erin deck 604', false),
  (605, 'Erin deck 605', false),
  (606, 'Erin deck 606', false),
  (607, 'Erin deck 607', false),
  (608, 'Erin deck 608', false),
  (609, 'Erin deck 609', false),
  (610, 'Erin deck 610', false),
  (611, 'Erin deck 611', false);

-- Cards + a review on deck 611, which starts out beyond the limit (locked).
-- Used later to prove unlocking a deck via reorder never touches review data.
INSERT INTO public.cards (id, deck_id, front_text, back_text, rank) VALUES
  (6110, 611, 'D611 Q1', 'A1', 1000),
  (6111, 611, 'D611 Q2', 'A2', 2000);

INSERT INTO public.reviews (id, card_id, due, stability, difficulty)
VALUES (6110, 6110, now() - interval '1 day', 5.5, 6.6);

SET LOCAL role = 'postgres';

-- Stamp the grace deadline (12 decks > the free deck_limit of 10).
SELECT public.begin_downgrade_grace('e0000000-0000-0000-0000-00000000c001'::uuid);


-- ── Rank boundary [obligation] ────────────────────────────────────────────────

-- Test 1: the top 10 decks by rank (600-609) are all unlocked.
SELECT is(
  (
    SELECT count(*)::int
    FROM public.decks
    WHERE id BETWEEN 600 AND 609
      AND public.deck_lock_deadline(id) IS NULL
  ),
  10,
  'the top deck_limit decks by rank are unlocked (deck_lock_deadline IS NULL) [obligation]'
);

-- Test 2: every deck beyond the limit (610, 611) is locked.
SELECT is(
  (
    SELECT count(*)::int
    FROM public.decks
    WHERE id IN (610, 611)
      AND public.deck_lock_deadline(id) IS NOT NULL
  ),
  2,
  'every deck ranked beyond deck_limit is locked (deck_lock_deadline IS NOT NULL) [obligation]'
);


-- ── Reorder is live [obligation] ──────────────────────────────────────────────

-- Capture the deadline before the reorder, to prove afterwards that moving a
-- deck never touches it.
CREATE TEMP TABLE _deadline_before AS
SELECT downgrade_delete_at FROM public.members WHERE id = 'e0000000-0000-0000-0000-00000000c001';

SELECT tests.set_claims('e0000000-0000-0000-0000-00000000c001'::uuid);
SET LOCAL role = 'authenticated';

-- Move locked deck 611 to the very front — well inside the top 10.
SELECT public.move_deck(611, 600, 'before');

SET LOCAL role = 'postgres';

-- Test 3: deck 611 is unlocked now that its rank sits inside the limit.
SELECT is(
  (SELECT public.deck_lock_deadline(611)),
  NULL::timestamptz,
  'reordering a locked deck above the limit line unlocks it [obligation]'
);

-- Test 4: deck 609, displaced from position 10 to position 11, is now locked.
SELECT isnt(
  (SELECT public.deck_lock_deadline(609)),
  NULL::timestamptz,
  'the deck displaced past the limit line by the reorder becomes locked [obligation]'
);

-- Test 5: the reorder wrote only decks.rank — the member's grace deadline
-- itself was never touched.
SELECT is(
  (SELECT downgrade_delete_at FROM public.members WHERE id = 'e0000000-0000-0000-0000-00000000c001'),
  (SELECT downgrade_delete_at FROM _deadline_before),
  'reordering a deck does not write to the member''s downgrade_delete_at [obligation]'
);


-- ── Unlock preserves review data [obligation] ─────────────────────────────────

-- Test 6: the review row on deck 611's card still exists after the unlock.
SELECT is(
  (SELECT count(*)::int FROM public.reviews WHERE card_id = 6110),
  1,
  'the review row for a card on the now-unlocked deck still exists [obligation]'
);

-- Test 7: its FSRS fields are untouched — unlocking never writes to reviews.
SELECT is(
  (SELECT stability FROM public.reviews WHERE card_id = 6110),
  5.5::real,
  'the review''s FSRS fields are unchanged by the unlock [obligation]'
);


-- ── get_member_decks() reporting [obligation] ─────────────────────────────────

SELECT tests.set_claims('e0000000-0000-0000-0000-00000000c001'::uuid);
SET LOCAL role = 'authenticated';

-- Test 8: the now-unlocked deck 611 reports is_locked = false.
SELECT is(
  (
    SELECT is_locked FROM public.get_member_decks(date_trunc('day', now()))
    WHERE id = 611
  ),
  false,
  'get_member_decks() reports is_locked = false for the unlocked deck [obligation]'
);

-- Test 9: ... and locked_delete_at NULL to match.
SELECT is(
  (
    SELECT locked_delete_at FROM public.get_member_decks(date_trunc('day', now()))
    WHERE id = 611
  ),
  NULL::timestamptz,
  'get_member_decks() reports locked_delete_at = NULL for the unlocked deck [obligation]'
);

-- Test 10: the now-locked deck 609 reports is_locked = true.
SELECT is(
  (
    SELECT is_locked FROM public.get_member_decks(date_trunc('day', now()))
    WHERE id = 609
  ),
  true,
  'get_member_decks() reports is_locked = true for the locked deck [obligation]'
);

-- Test 11: ... with locked_delete_at set to the member's grace deadline.
SELECT is(
  (
    SELECT locked_delete_at FROM public.get_member_decks(date_trunc('day', now()))
    WHERE id = 609
  ),
  (SELECT downgrade_delete_at FROM public.members WHERE id = 'e0000000-0000-0000-0000-00000000c001'),
  'get_member_decks() sets locked_delete_at to the member''s grace deadline [obligation]'
);

-- Test 12: ... and its due_count is forced to 0.
SELECT is(
  (
    SELECT due_count FROM public.get_member_decks(date_trunc('day', now()))
    WHERE id = 609
  ),
  0,
  'get_member_decks() forces due_count to 0 for a locked deck [obligation]'
);

SELECT * FROM finish();
ROLLBACK;
