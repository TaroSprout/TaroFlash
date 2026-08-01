-- =============================================================================
-- RLS tests: reviews + review_logs tables
--
-- Strict member isolation — you can ONLY see your own data.
-- review_logs is append-only: no UPDATE or DELETE policies.
-- =============================================================================

BEGIN;

SELECT plan(8);

-- ── Setup ─────────────────────────────────────────────────────────────────────

SELECT tests.create_user('11111111-1111-1111-1111-111111111111'::uuid, 'alice_reviews');
SELECT tests.create_user('22222222-2222-2222-2222-222222222222'::uuid, 'bob_reviews');

SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
INSERT INTO public.decks (id, title, is_public) VALUES (100, 'Alice Deck', true);
INSERT INTO public.cards (id, deck_id, front_text, back_text, rank) VALUES (1000, 100, 'Q1', 'A1', 1000);
INSERT INTO public.reviews (id, card_id, due, stability, difficulty) VALUES (100, 1000, now(), 1.0, 5.0);
INSERT INTO public.review_logs (card_id, member_id, rating, state, due, review)
VALUES (1000, '11111111-1111-1111-1111-111111111111', 3, 0, now(), now());

SELECT tests.set_claims('22222222-2222-2222-2222-222222222222'::uuid);
INSERT INTO public.decks (id, title, is_public) VALUES (200, 'Bob Deck', false);
INSERT INTO public.cards (id, deck_id, front_text, back_text, rank) VALUES (2000, 200, 'Q2', 'A2', 1000);
INSERT INTO public.reviews (id, card_id, due, stability, difficulty) VALUES (200, 2000, now(), 1.0, 5.0);
INSERT INTO public.review_logs (card_id, member_id, rating, state, due, review)
VALUES (2000, '22222222-2222-2222-2222-222222222222', 3, 0, now(), now());


-- ── Act as Alice ──────────────────────────────────────────────────────────────
SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
SET LOCAL role = 'authenticated';

-- Test 1: Alice sees only her own review
SELECT is(
  (SELECT count(*) FROM public.reviews WHERE id IN (100, 200))::int,
  1,
  'Alice sees only her own review'
);

-- Test 2: Alice cannot see Bob's review by ID
SELECT is(
  (SELECT count(*) FROM public.reviews WHERE id = 200)::int,
  0,
  'Alice cannot see Bob''s review even by ID'
);

-- Test 3: Alice can update her own review
SELECT lives_ok(
  $$
    UPDATE public.reviews SET stability = 2.0 WHERE card_id = 1000
  $$,
  'Alice can update her own review'
);

-- Test 4: Alice cannot update Bob's review
UPDATE public.reviews SET stability = 99.0 WHERE card_id = 2000;

SET LOCAL role = 'postgres';
SELECT is(
  (SELECT stability FROM public.reviews WHERE card_id = 2000),
  1.0::real,
  'Alice cannot update Bob''s review (stability unchanged)'
);

-- Test 5: Alice sees only her own review logs
SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
SET LOCAL role = 'authenticated';

SELECT is(
  (SELECT count(*) FROM public.review_logs
   WHERE member_id IN (
     '11111111-1111-1111-1111-111111111111',
     '22222222-2222-2222-2222-222222222222'
   ))::int,
  1,
  'Alice sees only her own review log'
);

-- Test 6: Alice can insert a log for her own card
SELECT lives_ok(
  $$
    INSERT INTO public.review_logs (card_id, member_id, rating, state, due, review)
    VALUES (1000, '11111111-1111-1111-1111-111111111111', 4, 1, now(), now() + interval '1 minute')
  $$,
  'Alice can insert a review log for her own card'
);

-- Test 7: Alice CANNOT insert a log with Bob's member_id
SELECT throws_ok(
  $$
    INSERT INTO public.review_logs (card_id, member_id, rating, state, due, review)
    VALUES (2000, '22222222-2222-2222-2222-222222222222', 4, 1, now(), now())
  $$,
  NULL,
  NULL,
  'Alice cannot insert a review log with Bob''s member_id'
);

-- Test 8: Review logs are append-only (no UPDATE even for own rows)
UPDATE public.review_logs SET rating = 1
WHERE member_id = '11111111-1111-1111-1111-111111111111';

SET LOCAL role = 'postgres';
SELECT ok(
  (SELECT bool_and(rating IN (3, 4))
   FROM public.review_logs
   WHERE member_id = '11111111-1111-1111-1111-111111111111'),
  'Review logs are append-only: Alice cannot update her own logs'
);


SELECT * FROM finish();
ROLLBACK;
