-- =============================================================================
-- RPC function tests: delete_deck
-- =============================================================================
-- Covers:
--   • owner can delete their own deck
--   • non-owner cannot delete someone else's deck
--   • cards in the deck are cascade-deleted
--   • reviews / review_logs of those cards are cascade-deleted
--   • media rows tied to the deck (via deck_id or via card_id) are tombstoned
--     and have their FK columns NULLed — not hard-deleted (so cleanup-media
--     can still reap their storage objects)
--   • pre-existing tombstones preserve their original deleted_at (COALESCE)
--   • reviews / review_logs of unrelated decks are untouched
-- =============================================================================

BEGIN;

SELECT plan(11);

-- ── Setup ─────────────────────────────────────────────────────────────────────

SELECT tests.create_user('11111111-1111-1111-1111-111111111111'::uuid, 'alice_dd');
SELECT tests.create_user('22222222-2222-2222-2222-222222222222'::uuid, 'bob_dd');

-- Alice owns two decks: 9300 (the one she'll delete) and 9301 (control deck,
-- should be untouched). Bob owns deck 9400.
SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
INSERT INTO public.decks (id, title, is_public) VALUES
  (9300, 'Alice Delete Target', false),
  (9301, 'Alice Control', false);
INSERT INTO public.cards (id, deck_id, front_text, back_text, rank) VALUES
  (93000, 9300, 'Q1', 'A1', 1000),
  (93001, 9300, 'Q2', 'A2', 2000),
  (3100, 9301, 'CTRL', 'CTRL', 1000);

-- Media rows for Alice's deck-9300 scope:
--   • 930000 — card-scoped, currently active (deleted_at NULL)
--   • 930001 — card-scoped, ALREADY tombstoned with a known timestamp
--   • 930002 — deck-scoped (cover), currently active
-- Media row for Alice's control deck (deck 9301):
--   • 930100 — card-scoped, active, must survive untouched
INSERT INTO public.media (id, member_id, card_id, deck_id, bucket, path, slot, deleted_at) VALUES
  (930000, '11111111-1111-1111-1111-111111111111'::uuid, 93000, NULL, 'cards', 'p/a', 'card_front'::public.media_slot, NULL),
  (930001, '11111111-1111-1111-1111-111111111111'::uuid, 93001, NULL, 'cards', 'p/b', 'card_back'::public.media_slot, '2020-01-01 00:00:00+00'),
  (930002, '11111111-1111-1111-1111-111111111111'::uuid, NULL, 9300, 'decks', 'p/cover', NULL, NULL),
  (930100, '11111111-1111-1111-1111-111111111111'::uuid, 3100, NULL, 'cards', 'p/c', 'card_front'::public.media_slot, NULL);

-- Reviews + review_logs: one set on a card of the delete-target deck (9300),
-- one set on the control deck's card (3100). reviews.member_id is auto-stamped
-- by set_member_id (claims are Alice's); review_logs has no such trigger, so its
-- NOT NULL member_id is set explicitly.
INSERT INTO public.reviews (id, card_id, due) VALUES
  (9301001, 93000, now()),   -- target deck card
  (9301002, 3100, now());    -- control deck card
INSERT INTO public.review_logs (id, card_id, member_id, rating, state, due, review) VALUES
  (9301001, 93000, '11111111-1111-1111-1111-111111111111'::uuid, 3, 2, now(), now()),
  (9301002, 3100,  '11111111-1111-1111-1111-111111111111'::uuid, 3, 2, now(), now());

SELECT tests.set_claims('22222222-2222-2222-2222-222222222222'::uuid);
INSERT INTO public.decks (id, title, is_public) VALUES (9400, 'Bob Deck', false);


-- ── Ownership guard ───────────────────────────────────────────────────────────

-- Test 1: Alice cannot delete Bob's deck.
SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
SET LOCAL role = 'authenticated';

SELECT throws_ok(
  $$ SELECT public.delete_deck(9400) $$,
  'Deck not found or not owned by user',
  'delete_deck refuses to delete a deck the caller does not own'
);


-- ── Happy path: delete deck 9300 ───────────────────────────────────────────────

SELECT lives_ok(
  $$ SELECT public.delete_deck(9300) $$,
  'Alice can delete her own deck'
);


-- ── Assertions on the resulting state ─────────────────────────────────────────

SET LOCAL role = 'postgres';

-- Test 3: the deck row is gone.
SELECT is(
  (SELECT count(*) FROM public.decks WHERE id = 9300)::int,
  0,
  'delete_deck removes the deck row'
);

-- Test 4: the deck's cards are cascade-deleted.
SELECT is(
  (SELECT count(*) FROM public.cards WHERE deck_id = 9300)::int,
  0,
  'cards belonging to the deleted deck are cascade-removed'
);

-- Test 5: media rows tied to the deck are NOT hard-deleted — they remain so
-- cleanup-media can reap their storage objects.
SELECT is(
  (SELECT count(*) FROM public.media WHERE id IN (930000, 930001, 930002))::int,
  3,
  'media rows tied to the deleted deck survive the cascade (tombstoned, not removed)'
);

-- Test 6: every tombstoned media row has its FK columns NULLed so the
-- cascade DELETE on cards/deck couldn't violate media_card_id_fkey /
-- media_deck_id_fkey.
SELECT is(
  (SELECT count(*) FROM public.media
    WHERE id IN (930000, 930001, 930002)
      AND card_id IS NULL AND deck_id IS NULL)::int,
  3,
  'tombstoned media have card_id and deck_id set to NULL'
);

-- Test 7: a media row that was already tombstoned BEFORE delete_deck ran
-- keeps its original deleted_at (COALESCE preserves it). cleanup-media's
-- reap batching depends on stable timestamps.
SELECT is(
  (SELECT deleted_at FROM public.media WHERE id = 930001),
  '2020-01-01 00:00:00+00'::timestamptz,
  'pre-existing tombstone preserves its original deleted_at via COALESCE'
);

-- Test 8: media tied to OTHER decks is untouched.
SELECT ok(
  (SELECT card_id = 3100 AND deck_id IS NULL AND deleted_at IS NULL
     FROM public.media WHERE id = 930100),
  'media belonging to unrelated decks is untouched'
);

-- Test 9: reviews of the deleted deck's cards are cascade-removed
-- (reviews.card_id -> cards ON DELETE CASCADE, fired by the card cascade).
SELECT is(
  (SELECT count(*) FROM public.reviews WHERE card_id IN (93000, 93001))::int,
  0,
  'reviews of the deleted deck''s cards are cascade-removed'
);

-- Test 10: review_logs of the deleted deck's cards are cascade-removed.
SELECT is(
  (SELECT count(*) FROM public.review_logs WHERE card_id IN (93000, 93001))::int,
  0,
  'review_logs of the deleted deck''s cards are cascade-removed'
);

-- Test 11: the control deck's review + review_log are untouched.
SELECT ok(
  (SELECT count(*) FROM public.reviews WHERE id = 9301002) = 1
    AND (SELECT count(*) FROM public.review_logs WHERE id = 9301002) = 1,
  'reviews/review_logs of unrelated decks are untouched'
);


SELECT * FROM finish();
ROLLBACK;
