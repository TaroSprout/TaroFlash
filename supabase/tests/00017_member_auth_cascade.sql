-- =============================================================================
-- Cascade test: deleting an auth.users row erases the member and all their data
--
-- Guards the account-deletion contract end to end:
--   * members.id -> auth.users is ON DELETE CASCADE (20260601000001), and every
--     table below members already cascades, so removing the auth user takes the
--     member, decks, and cards with it.
--   * the media soft-delete triggers (20260601000002) must not FK-block that
--     cascade — even for an already soft-deleted media row — and must work under
--     an empty search_path (the shape supabase_auth_admin runs the cascade in).
-- =============================================================================

BEGIN;

SELECT plan(6);

-- Setup: a user (helper inserts auth.users + fires the signup trigger that
-- creates the member row), then a deck + card owned by them.
SELECT tests.create_user('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'cascade_user');
SELECT tests.set_claims('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid);
SET LOCAL role = 'authenticated';

INSERT INTO public.decks (id, title, is_public) VALUES (990001, 'Cascade Deck', false);
INSERT INTO public.cards (id, deck_id, front_text, back_text, rank)
VALUES (990001, 990001, 'Q', 'A', 1);

SET LOCAL role = 'postgres';

-- A previously soft-deleted media row still pointing at the card. Before the
-- trigger fix this kept card_id set and FK-blocked the card's cascade delete.
INSERT INTO public.media (member_id, card_id, bucket, path, slot, deleted_at)
VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccccc', 990001, 'member-images',
  'cccccccc-cccc-cccc-cccc-cccccccccccc/abc.png', 'card_front', now()
);

-- A review + review_log for the card. Both cascade to the member two ways
-- (reviews/review_logs -> members and -> cards are ON DELETE CASCADE), so the
-- account-deletion cascade must remove them.
INSERT INTO public.reviews (id, card_id, member_id, due)
VALUES (990001, 990001, 'cccccccc-cccc-cccc-cccc-cccccccccccc', now());
INSERT INTO public.review_logs (id, card_id, member_id, rating, state, due, review)
VALUES (990001, 990001, 'cccccccc-cccc-cccc-cccc-cccccccccccc', 3, 2, now(), now());

SELECT is(
  (SELECT count(*) FROM public.cards WHERE id = 990001)::int,
  1,
  'card exists before the auth user is deleted'
);

-- Empty search_path mimics supabase_auth_admin running the cascade: an
-- unqualified `media` reference in a trigger would raise "relation media does
-- not exist" here.
SET LOCAL search_path = '';
DELETE FROM auth.users WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
RESET search_path;

SELECT is(
  (SELECT count(*) FROM public.members WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc')::int,
  0,
  'member row is cascade-deleted with its auth user'
);

SELECT is(
  (SELECT count(*) FROM public.cards WHERE id = 990001)::int,
  0,
  'card is cascade-deleted despite a lingering soft-deleted media row'
);

SELECT is(
  (SELECT count(*) FROM public.reviews WHERE id = 990001)::int,
  0,
  'review is cascade-deleted with the auth user'
);

SELECT is(
  (SELECT count(*) FROM public.review_logs WHERE id = 990001)::int,
  0,
  'review_log is cascade-deleted with the auth user'
);

SELECT is(
  (SELECT count(*) FROM public.media
    WHERE path = 'cccccccc-cccc-cccc-cccc-cccccccccccc/abc.png'
      AND card_id IS NULL
      AND deleted_at IS NOT NULL)::int,
  1,
  'media row survives as a soft-deleted orphan with card_id cleared (for the cron)'
);

SELECT * FROM finish();
ROLLBACK;
