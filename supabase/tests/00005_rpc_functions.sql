-- =============================================================================
-- RPC function tests: save_review, reserve_card, insert_card_at, move_card,
-- delete_cards_in_deck, bulk_insert_cards_in_deck
-- =============================================================================
-- Section order matters: insert_card_at runs against the original deck-100
-- card layout (1000@1000, 1001@2000), and move_card mutates ranks in deck 100,
-- so move_card runs after — otherwise its rank shuffle would invalidate the
-- relative-position assertions in the insert_card_at section.
-- delete_cards_in_deck uses its own dedicated deck (102) so the bulk DELETEs
-- don't cascade into surprises elsewhere.
-- bulk_insert_cards_in_deck uses dedicated deck (103) for the same reason.

BEGIN;

SELECT plan(21);

-- ── Setup ─────────────────────────────────────────────────────────────────────

SELECT tests.create_user('11111111-1111-1111-1111-111111111111'::uuid, 'alice_rpc');
SELECT tests.create_user('22222222-2222-2222-2222-222222222222'::uuid, 'bob_rpc');

SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
INSERT INTO public.decks (id, title, is_public) VALUES
  (100, 'Alice Deck', false),
  (101, 'Alice Empty Deck', false),
  (102, 'Alice Delete Deck', false),
  (103, 'Alice Bulk Insert Deck', false);
INSERT INTO public.cards (id, deck_id, front_text, back_text, rank) VALUES
  (1000, 100, 'Q1', 'A1', 1000),
  (1001, 100, 'Q2', 'A2', 2000),
  (1100, 102, 'D1', 'D1', 1000),
  (1101, 102, 'D2', 'D2', 2000),
  (1102, 102, 'D3', 'D3', 3000),
  (1103, 102, 'D4', 'D4', 4000),
  (1200, 103, 'B1', 'B1', 1000);

SELECT tests.set_claims('22222222-2222-2222-2222-222222222222'::uuid);
INSERT INTO public.decks (id, title, is_public) VALUES (200, 'Bob Deck', false);
INSERT INTO public.cards (id, deck_id, front_text, back_text, rank) VALUES
  (2000, 200, 'Q3', 'A3', 1000);


-- ── save_review ───────────────────────────────────────────────────────────────

-- Test 1: Alice can save a review for her own card
SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
SET LOCAL role = 'authenticated';

SELECT lives_ok(
  $$
    SELECT public.save_review(
      p_card_id := 1000,
      p_due := now() + interval '1 day',
      p_stability := 2.5, p_difficulty := 5.0,
      p_elapsed_days := 0::smallint, p_scheduled_days := 1::smallint,
      p_reps := 1::smallint, p_lapses := 0::smallint,
      p_last_review := now(), p_card_state := 0::smallint,
      p_rating := 3::smallint, p_state := 0::smallint,
      p_log_due := now(), p_log_stability := 0.0, p_log_difficulty := 0.0,
      p_log_scheduled_days := 0::smallint, p_review := now(),
      p_learning_steps := 0::smallint
    )
  $$,
  'Alice can save a review for her own card'
);

-- Test 2 & 3: Verify both tables were written
SET LOCAL role = 'postgres';

SELECT is(
  (SELECT count(*) FROM public.reviews WHERE card_id = 1000)::int,
  1,
  'save_review created a review row'
);

SELECT is(
  (SELECT count(*) FROM public.review_logs WHERE card_id = 1000)::int,
  1,
  'save_review created a review_log row'
);

-- Test 4: Alice cannot save a review for Bob's card
SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
SET LOCAL role = 'authenticated';

SELECT throws_ok(
  $$
    SELECT public.save_review(
      p_card_id := 2000,
      p_due := now() + interval '1 day',
      p_stability := 2.5, p_difficulty := 5.0,
      p_elapsed_days := 0::smallint, p_scheduled_days := 1::smallint,
      p_reps := 1::smallint, p_lapses := 0::smallint,
      p_last_review := now(), p_card_state := 0::smallint,
      p_rating := 3::smallint, p_state := 0::smallint,
      p_log_due := now(), p_log_stability := 0.0, p_log_difficulty := 0.0,
      p_log_scheduled_days := 0::smallint, p_review := now(),
      p_learning_steps := 0::smallint
    )
  $$,
  'Card not found or not owned by user',
  'Alice cannot save a review for Bob''s card'
);


-- ── reserve_card ──────────────────────────────────────────────────────────────

-- Test 5: Alice can reserve a card in her own deck
SELECT lives_ok(
  $$
    SELECT * FROM public.reserve_card(100, NULL, NULL)
  $$,
  'Alice can reserve a card in her own deck'
);

-- Test 6: Alice cannot reserve a card in Bob's deck
SELECT throws_ok(
  $$
    SELECT * FROM public.reserve_card(200, NULL, NULL)
  $$,
  'Deck not found or not owned by user',
  'Alice cannot reserve a card in Bob''s deck'
);


-- ── insert_card_at ────────────────────────────────────────────────────────────
-- Alice's deck 100 has cards 1000@1000 and 1001@2000 (plus a blank card from
-- the reserve_card test above, also at rank 1000). Tests below assert
-- relative-to-anchor ordering, not hardcoded rank values.
-- Alice's deck 101 is empty.

-- Test 7: bisect — inserting after card 1000 should resolve card 1001 as the
-- right neighbor and land strictly between the two anchors' current ranks.
SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
SET LOCAL role = 'authenticated';

SELECT public.insert_card_at(100, 1000, 'after', 'Bisect Q', 'Bisect A');

SELECT ok(
  (SELECT inserted.rank > left_anchor.rank AND inserted.rank < right_anchor.rank
     FROM public.cards inserted, public.cards left_anchor, public.cards right_anchor
    WHERE inserted.front_text = 'Bisect Q'
      AND left_anchor.id = 1000
      AND right_anchor.id = 1001),
  'insert_card_at after middle card bisects between anchor and its resolved right neighbor'
);

-- Test 8: append — inserting after card 1001 (the deck's last card) resolves
-- no right neighbor, so the new rank lands above the anchor's rank.
SELECT public.insert_card_at(100, 1001, 'after', 'Append Q', 'Append A');

SELECT ok(
  (SELECT inserted.rank > anchor.rank
     FROM public.cards inserted, public.cards anchor
    WHERE inserted.front_text = 'Append Q' AND anchor.id = 1001),
  'insert_card_at after last card appends: new rank > anchor rank'
);

-- Test 9: prepend — inserting before card 1000 (the deck's first card)
-- resolves no left neighbor, so the new rank lands below the anchor's rank.
SELECT public.insert_card_at(100, 1000, 'before', 'Prepend Q', 'Prepend A');

SELECT ok(
  (SELECT inserted.rank < anchor.rank
     FROM public.cards inserted, public.cards anchor
    WHERE inserted.front_text = 'Prepend Q' AND anchor.id = 1000),
  'insert_card_at before first card prepends: new rank < anchor rank'
);

-- Test 10: empty deck — anchor NULL bypasses neighbor resolution and
-- card_rank_between returns its seed rank (1000).
SELECT public.insert_card_at(101, NULL, NULL, 'Seed Q', 'Seed A');

SELECT is(
  (SELECT rank FROM public.cards WHERE front_text = 'Seed Q'),
  1000::numeric,
  'insert_card_at into empty deck with NULL anchor seeds rank at 1000'
);

-- Test 11: Alice cannot insert into Bob's deck.
SELECT throws_ok(
  $$
    SELECT public.insert_card_at(200, NULL, NULL, 'Sneaky Q', 'Sneaky A')
  $$,
  'Deck not found or not owned by user',
  'insert_card_at refuses inserts into a deck the caller does not own'
);

-- Test 12: NULL front_text is coerced to empty string.
SELECT public.insert_card_at(100, 1001, 'after', NULL, 'Only back');

SET LOCAL role = 'postgres';
SELECT is(
  (SELECT front_text FROM public.cards WHERE back_text = 'Only back'),
  '',
  'insert_card_at coerces NULL front_text to empty string'
);


-- ── move_card ─────────────────────────────────────────────────────────────────
-- Runs last so its rank mutations don't invalidate insert_card_at assertions.

-- Test 13: move card 1001 to before card 1000 → 1001's new rank lands below
-- 1000's current rank, regardless of any other cards inserted above.
SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
SET LOCAL role = 'authenticated';

SELECT public.move_card(1001, 1000, 'before');

SELECT ok(
  (SELECT moved.rank < anchor.rank
     FROM public.cards moved, public.cards anchor
    WHERE moved.id = 1001 AND anchor.id = 1000),
  'move_card before places moved card''s rank below the anchor'
);

-- Test 14: self-anchor is rejected before ownership is checked, so this
-- raises the self-anchor error even though Alice doesn't own card 2000.
SELECT throws_ok(
  $$
    SELECT public.move_card(2000, 2000, 'after')
  $$,
  'Cannot anchor a card to itself',
  'move_card rejects anchoring a card to itself before checking ownership'
);

-- Test 15: Alice cannot move Bob's card.
SELECT throws_ok(
  $$
    SELECT public.move_card(2000, 1000, 'after')
  $$,
  'Card not found or not owned by user',
  'move_card refuses to move a card the caller does not own'
);


-- ── delete_cards_in_deck ──────────────────────────────────────────────────────
-- Uses Alice's dedicated deck 102 (cards 1100-1103). All four cards exist
-- before the first delete test runs.

-- Test 16: delete with an exception list — leaves only the excepted cards.
SELECT public.delete_cards_in_deck(102, ARRAY[1100, 1102]::bigint[]);

SET LOCAL role = 'postgres';
SELECT results_eq(
  $$ SELECT id FROM public.cards WHERE deck_id = 102 ORDER BY id $$,
  $$ VALUES (1100::bigint), (1102::bigint) $$,
  'delete_cards_in_deck deletes everything except the excepted ids'
);

-- Test 17: delete with NULL exception list — clears the rest of the deck.
SET LOCAL role = 'authenticated';
SELECT public.delete_cards_in_deck(102, NULL);

SET LOCAL role = 'postgres';
SELECT is(
  (SELECT count(*) FROM public.cards WHERE deck_id = 102)::int,
  0,
  'delete_cards_in_deck with NULL except deletes every remaining card'
);

-- Test 18: Alice cannot bulk-delete in Bob's deck.
SET LOCAL role = 'authenticated';
SELECT throws_ok(
  $$
    SELECT public.delete_cards_in_deck(200, NULL)
  $$,
  'Deck not found or not owned by user',
  'delete_cards_in_deck refuses to delete from a deck the caller does not own'
);


-- ── bulk_insert_cards_in_deck ─────────────────────────────────────────────────
-- Uses Alice's dedicated deck 103 (one existing card 1200@1000).

-- Test 16: bulk insert appends new cards starting from MAX(rank) + 1000,
-- spaced 1000 apart in input order.
SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
SET LOCAL role = 'authenticated';

SELECT public.bulk_insert_cards_in_deck(
  103,
  '[{"front_text":"X1","back_text":"Y1"},{"front_text":"X2","back_text":"Y2"}]'::jsonb
);

SET LOCAL role = 'postgres';
SELECT results_eq(
  $$ SELECT front_text, rank FROM public.cards WHERE deck_id = 103 ORDER BY rank $$,
  $$ VALUES ('B1'::text, 1000::numeric), ('X1'::text, 2000::numeric), ('X2'::text, 3000::numeric) $$,
  'bulk_insert_cards_in_deck appends with sequential ranks above the deck max'
);

-- Test 17: empty array is a no-op (function returns zero rows, doesn't throw).
SET LOCAL role = 'authenticated';
SELECT is(
  (SELECT count(*)::int FROM public.bulk_insert_cards_in_deck(103, '[]'::jsonb)),
  0,
  'bulk_insert_cards_in_deck with an empty array inserts nothing and returns no rows'
);

-- Test 18: Alice cannot bulk insert into Bob's deck.
SELECT throws_ok(
  $$
    SELECT public.bulk_insert_cards_in_deck(
      200,
      '[{"front_text":"sneak","back_text":"sneak"}]'::jsonb
    )
  $$,
  'Deck not found or not owned by user',
  'bulk_insert_cards_in_deck refuses inserts into a deck the caller does not own'
);


SELECT * FROM finish();
ROLLBACK;
