-- =============================================================================
-- RPC function tests: save_review, delete_cards_in_deck
-- =============================================================================
-- reserve_card, insert_card_at, move_card, and bulk_insert_cards_in_deck were
-- dropped when card ranks moved to client-minted fractional-indexing keys —
-- inserts/moves are plain RLS-guarded table writes now. See 00016 for
-- move_cards_to_deck (the one RPC that survives, since PostgREST can't give
-- each row of a bulk update its own value).
-- =============================================================================

BEGIN;

SELECT plan(7);

-- ── Setup ─────────────────────────────────────────────────────────────────────

SELECT tests.create_user('11111111-1111-1111-1111-111111111111'::uuid, 'alice_rpc');
SELECT tests.create_user('22222222-2222-2222-2222-222222222222'::uuid, 'bob_rpc');

SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
INSERT INTO public.decks (id, title, is_public) VALUES
  (100, 'Alice Deck', false),
  (102, 'Alice Delete Deck', false);
INSERT INTO public.cards (id, deck_id, front_text, back_text, rank) VALUES
  (1000, 100, 'Q1', 'A1', 'a0'),
  (1001, 100, 'Q2', 'A2', 'b0'),
  (1100, 102, 'D1', 'D1', 'a0'),
  (1101, 102, 'D2', 'D2', 'b0'),
  (1102, 102, 'D3', 'D3', 'c0'),
  (1103, 102, 'D4', 'D4', 'd0');

SELECT tests.set_claims('22222222-2222-2222-2222-222222222222'::uuid);
INSERT INTO public.decks (id, title, is_public) VALUES (200, 'Bob Deck', false);
INSERT INTO public.cards (id, deck_id, front_text, back_text, rank) VALUES
  (2000, 200, 'Q3', 'A3', 'a0');


-- ── save_review ───────────────────────────────────────────────────────────────

-- Test 1: Alice can save a review for her own card
SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
SET LOCAL role = 'authenticated';

SELECT lives_ok(
  $$
    SELECT public.save_review(
      p_card_id := 1000,
      p_card := ROW(
        now() + interval '1 day', 2.5, 5.0,
        0::smallint, 1::smallint, 1::smallint, 0::smallint,
        now(), 0::smallint, 0::smallint
      )::public.review_card_state,
      p_log := ROW(
        3::smallint, 0::smallint, now(),
        0.0, 0.0, 0::smallint, now()
      )::public.review_log_entry
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
      p_card := ROW(
        now() + interval '1 day', 2.5, 5.0,
        0::smallint, 1::smallint, 1::smallint, 0::smallint,
        now(), 0::smallint, 0::smallint
      )::public.review_card_state,
      p_log := ROW(
        3::smallint, 0::smallint, now(),
        0.0, 0.0, 0::smallint, now()
      )::public.review_log_entry
    )
  $$,
  'Card not found or not owned by user',
  'Alice cannot save a review for Bob''s card'
);


-- ── delete_cards_in_deck ──────────────────────────────────────────────────────
-- Uses Alice's dedicated deck 102 (cards 1100-1103). All four cards exist
-- before the first delete test runs.

-- Test 5: delete with an exception list — leaves only the excepted cards.
SELECT public.delete_cards_in_deck(102, ARRAY[1100, 1102]::bigint[]);

SET LOCAL role = 'postgres';
SELECT results_eq(
  $$ SELECT id FROM public.cards WHERE deck_id = 102 ORDER BY id $$,
  $$ VALUES (1100::bigint), (1102::bigint) $$,
  'delete_cards_in_deck deletes everything except the excepted ids'
);

-- Test 6: delete with NULL exception list — clears the rest of the deck.
SET LOCAL role = 'authenticated';
SELECT public.delete_cards_in_deck(102, NULL);

SET LOCAL role = 'postgres';
SELECT is(
  (SELECT count(*) FROM public.cards WHERE deck_id = 102)::int,
  0,
  'delete_cards_in_deck with NULL except deletes every remaining card'
);

-- Test 7: Alice cannot bulk-delete in Bob's deck.
SET LOCAL role = 'authenticated';
SELECT throws_ok(
  $$
    SELECT public.delete_cards_in_deck(200, NULL)
  $$,
  'Deck not found or not owned by user',
  'delete_cards_in_deck refuses to delete from a deck the caller does not own'
);


SELECT * FROM finish();
ROLLBACK;
