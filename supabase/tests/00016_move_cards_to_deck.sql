-- =============================================================================
-- move_cards_to_deck + enforce_deck_card_limit pgTAP tests
-- =============================================================================
-- Covers every cross-cutting obligation specified for the move_cards_to_deck
-- RPC and the enforce_deck_card_limit helper.
--
-- Test plan index:
--   1  explicit mode preserves input order (WITH ORDINALITY)
--   2  select-all mode preserves source-deck rank order (ROW_NUMBER over rank)
--   3  select-all mode moves ALL cards, not just the loaded page (>50 cards)
--   4  same-deck rejected — explicit mode
--   5  same-deck rejected — select-all mode
--   6  dispatch validation — both args set → raises
--   7  dispatch validation — both NULL → raises
--   8  cross-member rejected — explicit mode
--   9  cross-member rejected — select-all mode
--  10  missing card id rejected — explicit mode
--  11  empty p_card_ids rejected
--  12  review/FSRS state travels with card (reviews row)
--  13  review/FSRS state travels with card (review_logs row)
--  14  duplicates allowed — move succeeds even when front+back match target card
--  15  free plan over cap raises PT402
--  16  paid plan is unbounded (succeeds moving into a 200-card deck)
--  17  insert_card_at P0001 retry block does NOT swallow PT402 cap error
--  18  enforce_deck_card_limit raises immediately when deck is at cap
-- =============================================================================

BEGIN;

SELECT plan(18);

-- ── Setup users ────────────────────────────────────────────────────────────────

SELECT tests.create_user('aaaaaaaa-aaaa-aaaa-aaaa-000000000001'::uuid, 'alice_move');
SELECT tests.create_user('bbbbbbbb-bbbb-bbbb-bbbb-000000000002'::uuid, 'bob_move');

-- ── Deck scaffold
-- Decks are inserted as postgres with set_claims active so the set_member_id
-- trigger stamps the correct member_id automatically (same pattern as 00002).
-- ─────────────────────────────────────────────────────────────────────────────

-- Alice's decks
SELECT tests.set_claims('aaaaaaaa-aaaa-aaaa-aaaa-000000000001'::uuid);

INSERT INTO public.decks (id, title, is_public) VALUES
  (5000, 'Explicit Source',    false),
  (5001, 'Explicit Target',    false),
  (5002, 'Rank Order Source',  false),
  (5003, 'Rank Order Target',  false),
  (5004, 'Big Source',         false),
  (5005, 'Big Target',         false),
  (5006, 'Cap Free Target',    false),
  (5007, 'Cap One Source',     false),
  (5008, 'Paid Source',        false),
  (5009, 'Paid Target',        false),
  (5010, 'Insert Cap Deck',    false),
  (5011, 'Review Source',      false),
  (5012, 'Review Target',      false),
  (5013, 'Dup Source',         false),
  (5014, 'Dup Target',         false);

-- Bob's deck (for cross-member rejection tests)
SELECT tests.set_claims('bbbbbbbb-bbbb-bbbb-bbbb-000000000002'::uuid);

INSERT INTO public.decks (id, title, is_public) VALUES
  (5099, 'Bob Deck', false);

-- ── Cards ─────────────────────────────────────────────────────────────────────
-- The set_member_id BEFORE INSERT trigger always overwrites member_id with
-- auth.uid() (even for postgres-role inserts). Set Alice's claims before
-- inserting Alice's cards so the trigger stamps the correct UUID.
--
-- Advance the card sequence above 100000 BEFORE any explicit-ID inserts so that
-- subsequent auto-ID inserts (generate_series) start above 100000 and never
-- collide with our explicit IDs (9001-9090).
--
-- setval is NON-transactional, so it survives this test's ROLLBACK. Using a flat
-- 100000 would strand the sequence below any committed card whose id is already
-- past 100000 (dev DBs accumulate these), making the NEXT insert anywhere collide
-- on Cards_pkey. GREATEST(100000, max(id)) keeps the sequence at or above the
-- real high-water mark, so it's always safe to leave behind.

SELECT setval(
  pg_get_serial_sequence('public.cards', 'id'),
  GREATEST(100000, (SELECT COALESCE(MAX(id), 0) FROM public.cards))
);

SELECT tests.set_claims('aaaaaaaa-aaaa-aaaa-aaaa-000000000001'::uuid);

-- Cards for explicit-mode order test (5000 → 5001).
-- Ranks: 9001@3000, 9002@1000, 9003@2000. We'll pass [9001,9002,9003] to RPC.
INSERT INTO public.cards (id, deck_id, front_text, back_text, rank, member_id) VALUES
  (9001, 5000, 'C', 'C', 3000, 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'),
  (9002, 5000, 'A', 'A', 1000, 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'),
  (9003, 5000, 'B', 'B', 2000, 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001');

-- Cards for select-all rank-order test (5002 → 5003). Ranks 1000<2000<3000.
INSERT INTO public.cards (id, deck_id, front_text, back_text, rank, member_id) VALUES
  (9010, 5002, 'SA', 'SA', 1000, 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'),
  (9011, 5002, 'SB', 'SB', 2000, 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'),
  (9012, 5002, 'SC', 'SC', 3000, 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001');

-- One card in 5007 to try to move into the capped deck 5006.
INSERT INTO public.cards (id, deck_id, front_text, back_text, rank, member_id) VALUES
  (9020, 5007, 'Move Me', 'Move Me', 1000, 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001');

-- Paid source 5008: 3 cards to move into 5009 (should succeed under paid plan).
INSERT INTO public.cards (id, deck_id, front_text, back_text, rank, member_id) VALUES
  (9050, 5008, 'Paid 1', 'P1', 1000, 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'),
  (9051, 5008, 'Paid 2', 'P2', 2000, 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'),
  (9052, 5008, 'Paid 3', 'P3', 3000, 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001');

-- Review travel test card.
INSERT INTO public.cards (id, deck_id, front_text, back_text, rank, member_id) VALUES
  (9030, 5011, 'R-front', 'R-back', 1000, 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001');

-- Cards for duplicate-allowed test.
INSERT INTO public.cards (id, deck_id, front_text, back_text, rank, member_id) VALUES
  (9040, 5013, 'Dup-front', 'Dup-back', 1000, 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'),
  (9041, 5014, 'Dup-front', 'Dup-back', 1000, 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001');

-- Bob's card (set Bob's claims so the trigger stamps his member_id).
SELECT tests.set_claims('bbbbbbbb-bbbb-bbbb-bbbb-000000000002'::uuid);
INSERT INTO public.cards (id, deck_id, front_text, back_text, rank, member_id) VALUES
  (9090, 5099, 'Bob Card', 'Bob Card', 1000, 'bbbbbbbb-bbbb-bbbb-bbbb-000000000002');

-- Bulk inserts (auto-generated IDs, all start at > 100000).
SELECT tests.set_claims('aaaaaaaa-aaaa-aaaa-aaaa-000000000001'::uuid);

-- 210 cards in big-source deck 5004 (select-all >50 test). Alice needs 'paid'
-- at move time so the 210-card move does not hit the free cap.
INSERT INTO public.cards (deck_id, front_text, back_text, rank, member_id)
SELECT 5004, 'Big' || gs, 'Big' || gs, gs * 1000,
       'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'::uuid
FROM generate_series(1, 210) AS gs;

-- Deck 5006 = free-plan cap target: pre-fill to 200 (the free limit).
INSERT INTO public.cards (deck_id, front_text, back_text, rank, member_id)
SELECT 5006, 'Cap' || gs, 'Cap' || gs, gs * 1000,
       'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'::uuid
FROM generate_series(1, 200) AS gs;

-- Paid target 5009: pre-fill to 200 cards.
INSERT INTO public.cards (deck_id, front_text, back_text, rank, member_id)
SELECT 5009, 'PadFill' || gs, 'PF' || gs, gs * 1000,
       'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'::uuid
FROM generate_series(1, 200) AS gs;

-- Insert-cap deck 5010: fill to exactly 200 cards for cap-test-17.
INSERT INTO public.cards (deck_id, front_text, back_text, rank, member_id)
SELECT 5010, 'InsertCap' || gs, 'IC' || gs, gs * 1000,
       'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'::uuid
FROM generate_series(1, 200) AS gs;

-- Seed review + review_log for card 9030 (so we can assert they travel with it).
INSERT INTO public.reviews (card_id, member_id, due, stability, difficulty)
VALUES (9030, 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'::uuid,
        now() + interval '7 days', 2.5, 5.0);

INSERT INTO public.review_logs (card_id, member_id, rating, state, due, stability, difficulty, scheduled_days, review)
VALUES (9030, 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'::uuid,
        3, 0, now(), 2.5, 5.0, 1, now());


-- ─────────────────────────────────────────────────────────────────────────────
-- All RPC calls below run as Alice (authenticated).
-- ─────────────────────────────────────────────────────────────────────────────

SELECT tests.set_claims('aaaaaaaa-aaaa-aaaa-aaaa-000000000001'::uuid);
SET LOCAL role = 'authenticated';


-- ─────────────────────────────────────────────────────────────────────────────
-- Test 1: explicit mode preserves input order
-- Pass ids in order [9001, 9002, 9003] (source ranks 3000, 1000, 2000).
-- Expected result in target 5001: 9001 has lowest rank, then 9002, then 9003.
-- ─────────────────────────────────────────────────────────────────────────────

SELECT public.move_cards_to_deck(
  p_target_deck_id := 5001,
  p_card_ids       := ARRAY[9001, 9002, 9003]::bigint[]
);

SET LOCAL role = 'postgres';

SELECT results_eq(
  $$ SELECT id FROM public.cards WHERE deck_id = 5001 ORDER BY rank $$,
  $$ VALUES (9001::bigint), (9002::bigint), (9003::bigint) $$,
  'explicit mode: input array order is preserved in target deck ranks'
);


-- ─────────────────────────────────────────────────────────────────────────────
-- Test 2: select-all mode preserves source-deck rank order
-- Source deck 5002 has 9010@1000, 9011@2000, 9012@3000.
-- Expected order in target 5003: 9010, 9011, 9012.
-- ─────────────────────────────────────────────────────────────────────────────

SET LOCAL role = 'authenticated';

SELECT public.move_cards_to_deck(
  p_target_deck_id := 5003,
  p_source_deck_id := 5002
);

SET LOCAL role = 'postgres';

SELECT results_eq(
  $$ SELECT id FROM public.cards WHERE deck_id = 5003 ORDER BY rank $$,
  $$ VALUES (9010::bigint), (9011::bigint), (9012::bigint) $$,
  'select-all mode: source rank order is preserved in target deck'
);


-- ─────────────────────────────────────────────────────────────────────────────
-- Test 3: select-all mode moves ALL 210 cards (not just the first 50/page)
-- Upgrade Alice to paid so the 210-card move clears the cap check.
-- ─────────────────────────────────────────────────────────────────────────────

SET LOCAL role = 'postgres';
UPDATE public.members SET plan = 'paid'
 WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001';

SET LOCAL role = 'authenticated';

SELECT public.move_cards_to_deck(
  p_target_deck_id := 5005,
  p_source_deck_id := 5004,
  p_except_ids     := ARRAY[]::bigint[]
);

SET LOCAL role = 'postgres';

SELECT is(
  (SELECT count(*)::int FROM public.cards WHERE deck_id = 5005),
  210,
  'select-all mode moves all 210 cards (not just the first page)'
);

-- Downgrade Alice back to 'free' for the remaining cap tests.
UPDATE public.members SET plan = 'free'
 WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001';


-- ─────────────────────────────────────────────────────────────────────────────
-- Test 4: same-deck rejected — explicit mode
-- Cards 9001-9003 are now in deck 5001. Moving 9002 to 5001 again fails.
-- ─────────────────────────────────────────────────────────────────────────────

SET LOCAL role = 'authenticated';

SELECT throws_ok(
  $$ SELECT public.move_cards_to_deck(
       p_target_deck_id := 5001,
       p_card_ids       := ARRAY[9002]::bigint[]
     ) $$,
  'One or more cards are not movable to this deck',
  'explicit mode: card already in target deck is rejected'
);


-- ─────────────────────────────────────────────────────────────────────────────
-- Test 5: same-deck rejected — select-all mode
-- ─────────────────────────────────────────────────────────────────────────────

SELECT throws_ok(
  $$ SELECT public.move_cards_to_deck(
       p_target_deck_id := 5001,
       p_source_deck_id := 5001
     ) $$,
  'Source and target decks must differ',
  'select-all mode: source = target is rejected'
);


-- ─────────────────────────────────────────────────────────────────────────────
-- Test 6: dispatch validation — both p_card_ids AND p_source_deck_id set
-- ─────────────────────────────────────────────────────────────────────────────

SELECT throws_ok(
  $$ SELECT public.move_cards_to_deck(
       p_target_deck_id := 5001,
       p_card_ids       := ARRAY[9010]::bigint[],
       p_source_deck_id := 5003
     ) $$,
  'Pass exactly one of p_card_ids or p_source_deck_id',
  'passing both p_card_ids and p_source_deck_id raises dispatch error'
);


-- ─────────────────────────────────────────────────────────────────────────────
-- Test 7: dispatch validation — both NULL
-- ─────────────────────────────────────────────────────────────────────────────

SELECT throws_ok(
  $$ SELECT public.move_cards_to_deck(
       p_target_deck_id := 5001
     ) $$,
  'Pass exactly one of p_card_ids or p_source_deck_id',
  'passing neither p_card_ids nor p_source_deck_id raises dispatch error'
);


-- ─────────────────────────────────────────────────────────────────────────────
-- Test 8: cross-member rejected — explicit mode (Bob's card 9090)
-- ─────────────────────────────────────────────────────────────────────────────

-- RLS hides Bob's card from Alice's query, so the count check fires first with
-- count=0, raising 'One or more cards not found' (the vacuous-EXISTS path).
SELECT throws_ok(
  $$ SELECT public.move_cards_to_deck(
       p_target_deck_id := 5001,
       p_card_ids       := ARRAY[9090]::bigint[]
     ) $$,
  'One or more cards not found',
  'explicit mode: card owned by another member is rejected (not visible to caller)'
);


-- ─────────────────────────────────────────────────────────────────────────────
-- Test 9: cross-member rejected — select-all mode (Bob's source deck 5099)
-- ─────────────────────────────────────────────────────────────────────────────

SELECT throws_ok(
  $$ SELECT public.move_cards_to_deck(
       p_target_deck_id := 5001,
       p_source_deck_id := 5099
     ) $$,
  'Source deck not found or not owned by user',
  'select-all mode: source deck owned by another member is rejected'
);


-- ─────────────────────────────────────────────────────────────────────────────
-- Test 10: missing card id rejected — explicit mode
-- Card 99999 does not exist. EXISTS guard passes vacuously; count check fires.
-- ─────────────────────────────────────────────────────────────────────────────

SELECT throws_ok(
  $$ SELECT public.move_cards_to_deck(
       p_target_deck_id := 5001,
       p_card_ids       := ARRAY[99999]::bigint[]
     ) $$,
  'One or more cards not found',
  'explicit mode: non-existent card id is rejected by the count check'
);


-- ─────────────────────────────────────────────────────────────────────────────
-- Test 11: empty p_card_ids rejected
-- ─────────────────────────────────────────────────────────────────────────────

SELECT throws_ok(
  $$ SELECT public.move_cards_to_deck(
       p_target_deck_id := 5001,
       p_card_ids       := ARRAY[]::bigint[]
     ) $$,
  'No cards to move',
  'explicit mode: empty card_ids array is rejected'
);


-- ─────────────────────────────────────────────────────────────────────────────
-- Test 12: review row travels with card 9030
-- ─────────────────────────────────────────────────────────────────────────────

SELECT public.move_cards_to_deck(
  p_target_deck_id := 5012,
  p_card_ids       := ARRAY[9030]::bigint[]
);

SET LOCAL role = 'postgres';

SELECT is(
  (SELECT count(*)::int FROM public.reviews WHERE card_id = 9030),
  1,
  'review row still exists after moving card 9030'
);


-- ─────────────────────────────────────────────────────────────────────────────
-- Test 13: review_logs row travels with card 9030
-- ─────────────────────────────────────────────────────────────────────────────

SELECT is(
  (SELECT count(*)::int FROM public.review_logs WHERE card_id = 9030),
  1,
  'review_log row still exists after moving card 9030'
);


-- ─────────────────────────────────────────────────────────────────────────────
-- Test 14: duplicates allowed — card whose front+back match an existing target
-- card moves successfully without raising
-- ─────────────────────────────────────────────────────────────────────────────

SET LOCAL role = 'authenticated';

SELECT lives_ok(
  $$ SELECT public.move_cards_to_deck(
       p_target_deck_id := 5014,
       p_card_ids       := ARRAY[9040]::bigint[]
     ) $$,
  'moving a card whose content matches an existing target card succeeds (duplicates allowed)'
);


-- ─────────────────────────────────────────────────────────────────────────────
-- Test 15: free plan over cap raises PT402
-- Deck 5006 has 200 cards (at free limit). Card 9020 in 5007. Move → cap fires.
-- ─────────────────────────────────────────────────────────────────────────────

SELECT throws_ok(
  $$ SELECT public.move_cards_to_deck(
       p_target_deck_id := 5006,
       p_card_ids       := ARRAY[9020]::bigint[]
     ) $$,
  'PT402',
  'deck_card_limit_exceeded',
  'free plan: moving 1 card into a full 200-card deck raises PT402 deck_card_limit_exceeded'
);


-- ─────────────────────────────────────────────────────────────────────────────
-- Test 16: paid plan is unbounded
-- Deck 5009 has 200 cards. Move 3 cards from 5008 into it under paid plan.
-- ─────────────────────────────────────────────────────────────────────────────

SET LOCAL role = 'postgres';
UPDATE public.members SET plan = 'paid'
 WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001';

SET LOCAL role = 'authenticated';

SELECT lives_ok(
  $$ SELECT public.move_cards_to_deck(
       p_target_deck_id := 5009,
       p_source_deck_id := 5008
     ) $$,
  'paid plan: moving cards into a 200-card deck succeeds (no cap enforced)'
);

SET LOCAL role = 'postgres';
UPDATE public.members SET plan = 'free'
 WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001';


-- ─────────────────────────────────────────────────────────────────────────────
-- Test 17: insert_card_at P0001 retry block does NOT swallow PT402 cap error
-- Deck 5010 has 200 cards (free limit). insert_card_at catches SQLSTATE 'P0001'
-- (rank-precision) and retries — but PT402 must propagate, not be caught.
-- ─────────────────────────────────────────────────────────────────────────────

SET LOCAL role = 'authenticated';

SELECT throws_ok(
  $$ SELECT public.insert_card_at(5010, NULL, NULL, 'Over Cap', 'Over Cap') $$,
  'PT402',
  'deck_card_limit_exceeded',
  'insert_card_at P0001 retry block does not swallow PT402 cap error'
);


-- ─────────────────────────────────────────────────────────────────────────────
-- Test 18: enforce_deck_card_limit raises immediately when deck is at cap
-- ─────────────────────────────────────────────────────────────────────────────

SELECT throws_ok(
  $$ SELECT public.enforce_deck_card_limit(5010, 1) $$,
  'PT402',
  'deck_card_limit_exceeded',
  'enforce_deck_card_limit raises PT402 immediately when deck is at the free cap'
);


SELECT * FROM finish();
ROLLBACK;
