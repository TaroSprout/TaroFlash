-- =============================================================================
-- Card-image paywall + storage-orphan finder
-- (20260606000002_gate-card-image-media-to-paid.sql)
--
--   • media INSERT: card-image slots (card_front/card_back) require plan='paid';
--     non-card media (NULL slot — deck/audio) stays open to free members.
--   • find_orphan_storage_objects(): returns objects in media-tracked buckets
--     that have no media row, time-gated by created_at so a just-uploaded object
--     (row still seconds behind) is left alone.
-- =============================================================================

BEGIN;

SELECT plan(6);

-- ── Setup: a paid member (Alice) and a free member (Bob) ────────────────────
SELECT tests.create_user('11111111-1111-1111-1111-111111111111'::uuid, 'alice_paid');
SELECT tests.create_user('22222222-2222-2222-2222-222222222222'::uuid, 'bob_free');

UPDATE public.members SET plan = 'paid' WHERE id = '11111111-1111-1111-1111-111111111111';

-- Decks + cards. member_id is stamped from the JWT claim by set_member_id, so
-- set_claims before each owner's inserts (role stays postgres → RLS bypassed for
-- setup; auth.uid() still reads the claim).
SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
INSERT INTO public.decks (id, title) VALUES (9600, 'Alice deck');
INSERT INTO public.cards (id, deck_id, front_text, back_text, rank)
VALUES (96000, 9600, 'q', 'a', 1000);

SELECT tests.set_claims('22222222-2222-2222-2222-222222222222'::uuid);
INSERT INTO public.decks (id, title) VALUES (9601, 'Bob deck');
INSERT INTO public.cards (id, deck_id, front_text, back_text, rank)
VALUES (96010, 9601, 'q', 'a', 1000);

-- ── Bob (free): card-image media INSERT is rejected by the policy ────────────
SELECT tests.set_claims('22222222-2222-2222-2222-222222222222'::uuid);
SET LOCAL role = 'authenticated';

SELECT throws_ok(
  $$
    INSERT INTO public.media (card_id, bucket, path, slot)
    VALUES (96010, 'member-images', '22222222-2222-2222-2222-222222222222/h.png', 'card_front')
  $$,
  '42501',
  NULL,
  'free member cannot INSERT a card-image (card_front) media row'
);

-- ── Bob (free): non-card media (NULL slot) is still allowed ──────────────────
SELECT lives_ok(
  $$
    INSERT INTO public.media (deck_id, bucket, path)
    VALUES (9601, 'member-images', '22222222-2222-2222-2222-222222222222/deckbg.png')
  $$,
  'free member CAN INSERT non-card (NULL-slot) media'
);

-- ── Alice (paid): card-image media INSERT is allowed ────────────────────────
SET LOCAL role = 'postgres';
SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
SET LOCAL role = 'authenticated';

SELECT lives_ok(
  $$
    INSERT INTO public.media (card_id, bucket, path, slot)
    VALUES (96000, 'member-images', '11111111-1111-1111-1111-111111111111/h.png', 'card_front')
  $$,
  'paid member CAN INSERT a card-image (card_front) media row'
);

-- ── find_orphan_storage_objects ─────────────────────────────────────────────
SET LOCAL role = 'postgres';
SELECT tests.set_claims(NULL);

-- Three objects in the (now media-tracked) member-images bucket:
--   • h.png      — backed by Alice's media row above → tracked, keep
--   • orphan-old — no media row, older than the grace window → reap
--   • orphan-new — no media row but uploaded just now → within grace, keep
INSERT INTO storage.objects (bucket_id, name, owner, owner_id, created_at)
VALUES
  ('member-images', '11111111-1111-1111-1111-111111111111/h.png',
   '11111111-1111-1111-1111-111111111111'::uuid, '11111111-1111-1111-1111-111111111111',
   now() - interval '2 hours'),
  ('member-images', '11111111-1111-1111-1111-111111111111/orphan-old.png',
   '11111111-1111-1111-1111-111111111111'::uuid, '11111111-1111-1111-1111-111111111111',
   now() - interval '2 hours'),
  ('member-images', '11111111-1111-1111-1111-111111111111/orphan-new.png',
   '11111111-1111-1111-1111-111111111111'::uuid, '11111111-1111-1111-1111-111111111111',
   now());

SELECT is(
  (SELECT count(*)::int FROM public.find_orphan_storage_objects()
   WHERE name = '11111111-1111-1111-1111-111111111111/orphan-old.png'),
  1,
  'an aged object with no media row is reported as an orphan'
);

SELECT is(
  (SELECT count(*)::int FROM public.find_orphan_storage_objects()
   WHERE name = '11111111-1111-1111-1111-111111111111/h.png'),
  0,
  'an object backed by a media row is not reported'
);

SELECT is(
  (SELECT count(*)::int FROM public.find_orphan_storage_objects()
   WHERE name = '11111111-1111-1111-1111-111111111111/orphan-new.png'),
  0,
  'a fresh object within the grace window is not reported'
);

SELECT * FROM finish();
ROLLBACK;
