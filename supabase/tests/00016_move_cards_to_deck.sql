-- =============================================================================
-- move_cards_to_deck pgTAP tests
-- =============================================================================
-- Signature: move_cards_to_deck(p_target_deck_id, p_ranks, p_card_ids,
-- p_source_deck_id, p_except_ids). Ranks are minted client-side and passed in
-- as an ascending run sitting after the target deck's tail — the RPC pairs
-- them with the cards it resolves (source's own (rank, id) order) and ignores
-- any spare keys.
--
-- Test plan index:
--   1  explicit mode preserves the source's (rank, id) order at the destination
--   2  select-all mode preserves source-deck rank order
--   3  select-all mode moves ALL cards, not just the loaded page (>50 cards)
--   4  spare keys are ignored — extra p_ranks beyond the moved count is fine
--   5  too few keys raises
--   6  explicit mode — a card already in the target deck is left untouched
--   7  the already-in-target no-op keeps the card's original deck_id
--   8  same-deck rejected — select-all mode
--   9  dispatch validation — both args set → raises
--  10  dispatch validation — both NULL → raises
--  11  cross-member rejected — explicit mode
--  12  cross-member rejected — select-all mode
--  13  missing card id rejected — explicit mode
--  14  empty p_card_ids is a silent no-op (nothing resolves to move)
--  15  review/FSRS state travels with card (reviews row)
--  16  review/FSRS state travels with card (review_logs row)
--  17  duplicates allowed — move succeeds even when front+back match target card
--  18  free plan over cap raises PT402
--  19  paid plan is unbounded (succeeds moving into a 200-card deck)
--  20  mixed batch — one card already in target, one not — succeeds
--  21  mixed batch: moves only the one that wasn't there; the other untouched
-- =============================================================================

BEGIN;

SELECT plan(21);

-- ── Setup users ────────────────────────────────────────────────────────────────

SELECT tests.create_user('aaaaaaaa-aaaa-aaaa-aaaa-000000000001'::uuid, 'alice_move');
SELECT tests.create_user('bbbbbbbb-bbbb-bbbb-bbbb-000000000002'::uuid, 'bob_move');

-- ── Deck scaffold ────────────────────────────────────────────────────────────

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
  (5011, 'Review Source',      false),
  (5012, 'Review Target',      false),
  (5013, 'Dup Source',         false),
  (5014, 'Dup Target',         false),
  (5017, 'Spare Keys Source',  false),
  (5018, 'Spare Keys Target',  false),
  (5019, 'Too Few Keys Source', false),
  (5020, 'Too Few Keys Target', false);

SELECT tests.set_claims('bbbbbbbb-bbbb-bbbb-bbbb-000000000002'::uuid);

INSERT INTO public.decks (id, title, is_public) VALUES (5099, 'Bob Deck', false);

-- ── Cards ─────────────────────────────────────────────────────────────────────

SELECT setval(
  pg_get_serial_sequence('public.cards', 'id'),
  GREATEST(100000, (SELECT COALESCE(MAX(id), 0) FROM public.cards))
);

SELECT tests.set_claims('aaaaaaaa-aaaa-aaaa-aaaa-000000000001'::uuid);

-- Cards for explicit-mode order test (5000 → 5001).
-- Ranks: 9001@c, 9002@a, 9003@b. We'll pass [9001,9002,9003] to the RPC.
INSERT INTO public.cards (id, deck_id, front_text, back_text, rank, member_id) VALUES
  (9001, 5000, 'C', 'C', 'c0', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'),
  (9002, 5000, 'A', 'A', 'a0', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'),
  (9003, 5000, 'B', 'B', 'b0', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001');

-- Cards for select-all rank-order test (5002 → 5003).
INSERT INTO public.cards (id, deck_id, front_text, back_text, rank, member_id) VALUES
  (9010, 5002, 'SA', 'SA', 'a0', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'),
  (9011, 5002, 'SB', 'SB', 'b0', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'),
  (9012, 5002, 'SC', 'SC', 'c0', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001');

-- One card in 5007 to try to move into the capped deck 5006.
INSERT INTO public.cards (id, deck_id, front_text, back_text, rank, member_id) VALUES
  (9020, 5007, 'Move Me', 'Move Me', 'a0', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001');

-- Paid source 5008: 3 cards to move into 5009 (should succeed under paid plan).
INSERT INTO public.cards (id, deck_id, front_text, back_text, rank, member_id) VALUES
  (9050, 5008, 'Paid 1', 'P1', 'a0', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'),
  (9051, 5008, 'Paid 2', 'P2', 'b0', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'),
  (9052, 5008, 'Paid 3', 'P3', 'c0', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001');

-- Review travel test card.
INSERT INTO public.cards (id, deck_id, front_text, back_text, rank, member_id) VALUES
  (9030, 5011, 'R-front', 'R-back', 'a0', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001');

-- Cards for duplicate-allowed test.
INSERT INTO public.cards (id, deck_id, front_text, back_text, rank, member_id) VALUES
  (9040, 5013, 'Dup-front', 'Dup-back', 'a0', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'),
  (9041, 5014, 'Dup-front', 'Dup-back', 'a0', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001');

-- Cards for the spare-keys / too-few-keys tests.
INSERT INTO public.cards (id, deck_id, front_text, back_text, rank, member_id) VALUES
  (9060, 5017, 'Spare 1', 'S1', 'a0', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'),
  (9061, 5017, 'Spare 2', 'S2', 'b0', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'),
  (9070, 5019, 'Few 1', 'F1', 'a0', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'),
  (9071, 5019, 'Few 2', 'F2', 'b0', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001');

-- Bob's card.
SELECT tests.set_claims('bbbbbbbb-bbbb-bbbb-bbbb-000000000002'::uuid);
INSERT INTO public.cards (id, deck_id, front_text, back_text, rank, member_id) VALUES
  (9090, 5099, 'Bob Card', 'Bob Card', 'a0', 'bbbbbbbb-bbbb-bbbb-bbbb-000000000002');

SELECT tests.set_claims('aaaaaaaa-aaaa-aaaa-aaaa-000000000001'::uuid);

-- 210 cards in big-source deck 5004 (select-all >50 test).
INSERT INTO public.cards (deck_id, front_text, back_text, rank, member_id)
SELECT 5004, 'Big' || gs, 'Big' || gs, 'a' || lpad(gs::text, 5, '0'),
       'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'::uuid
FROM generate_series(1, 210) AS gs;

-- Deck 5006 = free-plan cap target: pre-fill to 500 (the free limit).
INSERT INTO public.cards (deck_id, front_text, back_text, rank, member_id)
SELECT 5006, 'Cap' || gs, 'Cap' || gs, 'a' || lpad(gs::text, 5, '0'),
       'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'::uuid
FROM generate_series(1, 500) AS gs;

-- Paid target 5009: pre-fill to 200 cards.
INSERT INTO public.cards (deck_id, front_text, back_text, rank, member_id)
SELECT 5009, 'PadFill' || gs, 'PF' || gs, 'a' || lpad(gs::text, 5, '0'),
       'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'::uuid
FROM generate_series(1, 200) AS gs;

-- Seed review + review_log for card 9030.
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


-- Test 1: explicit mode preserves the source's (rank, id) order at the
-- destination, not the p_card_ids input order — [9001,9002,9003] resolve by
-- source rank (a0=9002, b0=9003, c0=9001), so the target lands 9002,9003,9001.

SELECT public.move_cards_to_deck(
  p_target_deck_id := 5001,
  p_ranks          := ARRAY['z0', 'z1', 'z2']::text[],
  p_card_ids       := ARRAY[9001, 9002, 9003]::bigint[]
);

SET LOCAL role = 'postgres';

SELECT results_eq(
  $$ SELECT id FROM public.cards WHERE deck_id = 5001 ORDER BY rank $$,
  $$ VALUES (9002::bigint), (9003::bigint), (9001::bigint) $$,
  'explicit mode: cards land in the source''s (rank, id) order, keyed by p_ranks in that order'
);


-- Test 2: select-all mode preserves source-deck rank order.

SET LOCAL role = 'authenticated';

SELECT public.move_cards_to_deck(
  p_target_deck_id := 5003,
  p_ranks          := ARRAY['z0', 'z1', 'z2']::text[],
  p_source_deck_id := 5002
);

SET LOCAL role = 'postgres';

SELECT results_eq(
  $$ SELECT id FROM public.cards WHERE deck_id = 5003 ORDER BY rank $$,
  $$ VALUES (9010::bigint), (9011::bigint), (9012::bigint) $$,
  'select-all mode: source rank order is preserved in target deck'
);


-- Test 3: select-all mode moves ALL 210 cards (not just the first 50/page).
-- Upgrade Alice to paid so the 210-card move clears the cap check.

SET LOCAL role = 'postgres';
UPDATE public.members SET plan = 'paid'
 WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001';

SET LOCAL role = 'authenticated';

SELECT public.move_cards_to_deck(
  p_target_deck_id := 5005,
  p_ranks          := ARRAY(SELECT 'z' || lpad(gs::text, 5, '0') FROM generate_series(1, 210) AS gs),
  p_source_deck_id := 5004,
  p_except_ids     := ARRAY[]::bigint[]
);

SET LOCAL role = 'postgres';

SELECT is(
  (SELECT count(*)::int FROM public.cards WHERE deck_id = 5005),
  210,
  'select-all mode moves all 210 cards (not just the first page)'
);

UPDATE public.members SET plan = 'free'
 WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001';


-- Test 4: spare keys are ignored — passing more p_ranks than cards to move
-- succeeds and only uses as many as are needed.

SET LOCAL role = 'authenticated';

SELECT lives_ok(
  $$ SELECT public.move_cards_to_deck(
       p_target_deck_id := 5018,
       p_ranks          := ARRAY['z0', 'z1', 'z2', 'z3', 'z4']::text[],
       p_card_ids       := ARRAY[9060, 9061]::bigint[]
     ) $$,
  'spare keys beyond the moved count are silently ignored'
);


-- Test 5: too few keys raises.

SELECT throws_ok(
  $$ SELECT public.move_cards_to_deck(
       p_target_deck_id := 5020,
       p_ranks          := ARRAY['z0']::text[],
       p_card_ids       := ARRAY[9070, 9071]::bigint[]
     ) $$,
  'Got 1 ranks for 2 cards',
  'moving 2 cards with only 1 key raises'
);


-- Test 6 + 7: explicit mode — a card already in the target deck is left
-- untouched (no-op), keeping its original deck_id.

SELECT lives_ok(
  $$ SELECT public.move_cards_to_deck(
       p_target_deck_id := 5001,
       p_ranks          := ARRAY['z9']::text[],
       p_card_ids       := ARRAY[9002]::bigint[]
     ) $$,
  'explicit mode: a card already in the target deck no longer raises'
);

SET LOCAL role = 'postgres';

SELECT is(
  (SELECT deck_id FROM public.cards WHERE id = 9002),
  5001::bigint,
  'card already in the target deck keeps its original deck_id (true no-op)'
);


-- Test 8: same-deck rejected — select-all mode.

SET LOCAL role = 'authenticated';

SELECT throws_ok(
  $$ SELECT public.move_cards_to_deck(
       p_target_deck_id := 5001,
       p_ranks          := ARRAY['z0']::text[],
       p_source_deck_id := 5001
     ) $$,
  'Source and target decks must differ',
  'select-all mode: source = target is rejected'
);


-- Test 9: dispatch validation — both p_card_ids AND p_source_deck_id set.

SELECT throws_ok(
  $$ SELECT public.move_cards_to_deck(
       p_target_deck_id := 5001,
       p_ranks          := ARRAY['z0']::text[],
       p_card_ids       := ARRAY[9010]::bigint[],
       p_source_deck_id := 5003
     ) $$,
  'Pass exactly one of p_card_ids or p_source_deck_id',
  'passing both p_card_ids and p_source_deck_id raises dispatch error'
);


-- Test 10: dispatch validation — both NULL.

SELECT throws_ok(
  $$ SELECT public.move_cards_to_deck(
       p_target_deck_id := 5001,
       p_ranks          := ARRAY['z0']::text[]
     ) $$,
  'Pass exactly one of p_card_ids or p_source_deck_id',
  'passing neither p_card_ids nor p_source_deck_id raises dispatch error'
);


-- Test 11: cross-member rejected — explicit mode (Bob's card 9090).

SELECT throws_ok(
  $$ SELECT public.move_cards_to_deck(
       p_target_deck_id := 5001,
       p_ranks          := ARRAY['z0']::text[],
       p_card_ids       := ARRAY[9090]::bigint[]
     ) $$,
  'One or more cards are not movable to this deck',
  'explicit mode: card owned by another member is rejected'
);


-- Test 12: cross-member rejected — select-all mode (Bob's source deck 5099).

SELECT throws_ok(
  $$ SELECT public.move_cards_to_deck(
       p_target_deck_id := 5001,
       p_ranks          := ARRAY['z0']::text[],
       p_source_deck_id := 5099
     ) $$,
  'Source deck not found or not owned by user',
  'select-all mode: source deck owned by another member is rejected'
);


-- Test 13: missing card id rejected — explicit mode.

SELECT throws_ok(
  $$ SELECT public.move_cards_to_deck(
       p_target_deck_id := 5001,
       p_ranks          := ARRAY['z0']::text[],
       p_card_ids       := ARRAY[99999]::bigint[]
     ) $$,
  'One or more cards are not movable to this deck',
  'explicit mode: non-existent card id is rejected'
);


-- Test 14: empty p_card_ids resolves nothing to move — a silent no-op.

SELECT lives_ok(
  $$ SELECT public.move_cards_to_deck(
       p_target_deck_id := 5001,
       p_ranks          := ARRAY[]::text[],
       p_card_ids       := ARRAY[]::bigint[]
     ) $$,
  'explicit mode: empty card_ids array is a no-op, not an error'
);


-- Test 15 + 16: review + review_log rows travel with card 9030.

SELECT public.move_cards_to_deck(
  p_target_deck_id := 5012,
  p_ranks          := ARRAY['z0']::text[],
  p_card_ids       := ARRAY[9030]::bigint[]
);

SET LOCAL role = 'postgres';

SELECT is(
  (SELECT count(*)::int FROM public.reviews WHERE card_id = 9030),
  1,
  'review row still exists after moving card 9030'
);

SELECT is(
  (SELECT count(*)::int FROM public.review_logs WHERE card_id = 9030),
  1,
  'review_log row still exists after moving card 9030'
);


-- Test 17: duplicates allowed.

SET LOCAL role = 'authenticated';

SELECT lives_ok(
  $$ SELECT public.move_cards_to_deck(
       p_target_deck_id := 5014,
       p_ranks          := ARRAY['z0']::text[],
       p_card_ids       := ARRAY[9040]::bigint[]
     ) $$,
  'moving a card whose content matches an existing target card succeeds (duplicates allowed)'
);


-- Test 18: free plan over cap raises PT402.

SELECT throws_ok(
  $$ SELECT public.move_cards_to_deck(
       p_target_deck_id := 5006,
       p_ranks          := ARRAY['z0']::text[],
       p_card_ids       := ARRAY[9020]::bigint[]
     ) $$,
  'PT402',
  'deck_card_limit_exceeded',
  'free plan: moving 1 card into a full 500-card deck raises PT402 deck_card_limit_exceeded'
);


-- Test 19: paid plan is unbounded.

SET LOCAL role = 'postgres';
UPDATE public.members SET plan = 'paid'
 WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001';

SET LOCAL role = 'authenticated';

SELECT lives_ok(
  $$ SELECT public.move_cards_to_deck(
       p_target_deck_id := 5009,
       p_ranks          := ARRAY['z0', 'z1', 'z2']::text[],
       p_source_deck_id := 5008
     ) $$,
  'paid plan: moving cards into a 200-card deck succeeds (no cap enforced)'
);

SET LOCAL role = 'postgres';
UPDATE public.members SET plan = 'free'
 WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001';


-- Test 20 + 21: mixed batch — one card already home, one not.

INSERT INTO public.decks (id, title, is_public) VALUES
  (5015, 'Mixed Skip Source', false),
  (5016, 'Mixed Skip Target', false);

SELECT tests.set_claims('aaaaaaaa-aaaa-aaaa-aaaa-000000000001'::uuid);

INSERT INTO public.cards (id, deck_id, front_text, back_text, rank, member_id) VALUES
  (9042, 5016, 'Already Home', 'Already Home', 'a0', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'),
  (9043, 5015, 'Needs A Move', 'Needs A Move', 'a0', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001');

SET LOCAL role = 'authenticated';

SELECT lives_ok(
  $$ SELECT public.move_cards_to_deck(
       p_target_deck_id := 5016,
       p_ranks          := ARRAY['z0']::text[],
       p_card_ids       := ARRAY[9042, 9043]::bigint[]
     ) $$,
  'mixed batch (one card already home, one not) succeeds without raising'
);

SET LOCAL role = 'postgres';

SELECT results_eq(
  $$ SELECT id FROM public.cards WHERE deck_id = 5016 ORDER BY id $$,
  $$ VALUES (9042::bigint), (9043::bigint) $$,
  'both cards end up in the target deck — the already-there one untouched, the other moved'
);


SELECT * FROM finish();
ROLLBACK;
