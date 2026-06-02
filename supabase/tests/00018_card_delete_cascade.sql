-- =============================================================================
-- Cascade test: deleting a single card
-- =============================================================================
-- Mirrors the app's card-delete path (a raw DELETE on cards as the owner).
-- Covers:
--   • the card's reviews are cascade-deleted (reviews.card_id -> cards CASCADE)
--   • the card's review_logs are cascade-deleted (review_logs.card_id CASCADE)
--   • the card's media are tombstoned with card_id NULLed — not hard-deleted —
--     so cleanup-media can still reap their storage objects
--   • a sibling card in the same deck (and its reviews/logs) is untouched
-- =============================================================================

BEGIN;

SELECT plan(6);

-- ── Setup ─────────────────────────────────────────────────────────────────────

SELECT tests.create_user('11111111-1111-1111-1111-111111111111'::uuid, 'alice_cd');
SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);

-- One deck, two cards: 95000 (delete target) and 95001 (sibling, must survive).
INSERT INTO public.decks (id, title, is_public) VALUES (9500, 'Alice Card-Cascade', false);
INSERT INTO public.cards (id, deck_id, front_text, back_text, rank) VALUES
  (95000, 9500, 'Q1', 'A1', 1000),
  (95001, 9500, 'Q2', 'A2', 2000);

-- Reviews + review_logs on each card. reviews.member_id is auto-stamped by
-- set_member_id (Alice's claims are set); review_logs needs it explicitly.
INSERT INTO public.reviews (id, card_id, due) VALUES
  (95000, 95000, now()),
  (95001, 95001, now());
INSERT INTO public.review_logs (id, card_id, member_id, rating, state, due, review) VALUES
  (95000, 95000, '11111111-1111-1111-1111-111111111111'::uuid, 3, 2, now(), now()),
  (95001, 95001, '11111111-1111-1111-1111-111111111111'::uuid, 3, 2, now(), now());

-- Media for the target card: one active, one already tombstoned. Both must
-- survive the delete with card_id NULLed (for the cleanup-media cron).
INSERT INTO public.media (id, member_id, card_id, bucket, path, slot, deleted_at) VALUES
  (950000, '11111111-1111-1111-1111-111111111111'::uuid, 95000, 'member-images', 'p/a', 'card_front'::public.media_slot, NULL),
  (950001, '11111111-1111-1111-1111-111111111111'::uuid, 95000, 'member-images', 'p/b', 'card_back'::public.media_slot, now());

-- ── Delete the target card via the owner (app path) ────────────────────────────

SET LOCAL role = 'authenticated';
DELETE FROM public.cards WHERE id = 95000;
SET LOCAL role = 'postgres';

-- ── Assertions ────────────────────────────────────────────────────────────────

SELECT is(
  (SELECT count(*) FROM public.cards WHERE id = 95000)::int,
  0,
  'the target card is deleted'
);

SELECT is(
  (SELECT count(*) FROM public.cards WHERE id = 95001)::int,
  1,
  'a sibling card in the same deck is untouched'
);

SELECT is(
  (SELECT count(*) FROM public.reviews WHERE card_id = 95000)::int,
  0,
  'the card''s reviews are cascade-deleted'
);

SELECT is(
  (SELECT count(*) FROM public.review_logs WHERE card_id = 95000)::int,
  0,
  'the card''s review_logs are cascade-deleted'
);

SELECT ok(
  (SELECT count(*) FROM public.reviews WHERE id = 95001) = 1
    AND (SELECT count(*) FROM public.review_logs WHERE id = 95001) = 1,
  'the sibling card''s reviews/review_logs are untouched'
);

-- Both media rows survive (not hard-deleted) with card_id cleared, so the
-- cascade couldn't violate media_card_id_fkey.
SELECT is(
  (SELECT count(*) FROM public.media
    WHERE id IN (950000, 950001) AND card_id IS NULL)::int,
  2,
  'the card''s media are tombstoned with card_id NULLed (kept for the cron)'
);

SELECT * FROM finish();
ROLLBACK;
