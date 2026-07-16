-- =============================================================================
-- get_member_decks view + cards_with_images security_invoker
--
-- Covers:
--   1. security_invoker = true on the new view (Alice cannot read Bob's decks).
--   2. card_count column is accurate.
--   3. due_count column is accurate both before and after a review is written.
--   4. No join-duplication in the view row count.
--   5. Retrofit: cards_with_images now respects RLS (Bob can't see Alice's
--      private cards through the view).
-- =============================================================================

BEGIN;

SELECT plan(9);

-- ── Test: function returns the exact columns the FE consumes ─────────────────
-- Locks the OUT parameter list of get_member_decks. Renaming or removing a
-- column without updating the FE will fail here. (Cannot guard PostgREST
-- embed resolution — that's a contract-test job — but this catches column
-- drift cheaply.)
SELECT bag_eq(
  $$ SELECT parameter_name
     FROM information_schema.parameters
     WHERE specific_schema = 'public'
       AND specific_name LIKE 'get_member_decks%'
       AND parameter_mode = 'OUT' $$,
  $$ VALUES
      ('id'), ('created_at'), ('updated_at'), ('description'), ('is_public'),
      ('title'), ('member_id'), ('member_display_name'), ('tags'), ('has_image'),
      ('study_config'), ('cover_config'), ('card_attributes'), ('card_count'),
      ('reviewed_today_count'), ('new_reviewed_today_count'), ('due_count'), ('rank'),
      ('review_pacing_preset_id'), ('desired_retention'), ('learning_steps'), ('relearning_steps'),
      ('desired_retention_override'), ('learning_steps_override'), ('relearning_steps_override'),
      ('max_reviews_per_day'), ('max_new_per_day'),
      ('has_max_reviews_override'), ('max_reviews_per_day_override'),
      ('has_max_new_override'), ('max_new_per_day_override') $$,
  'get_member_decks exposes the columns the FE consumes'
);

-- ── Setup ─────────────────────────────────────────────────────────────────────

SELECT tests.create_user('11111111-1111-1111-1111-111111111111'::uuid, 'alice_stats');
SELECT tests.create_user('22222222-2222-2222-2222-222222222222'::uuid, 'bob_stats');

-- Alice: one private deck (100) with 2 cards, one public deck (101) with 1 card.
SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
INSERT INTO public.decks (id, title, is_public) VALUES
  (100, 'Alice Private Deck', false),
  (101, 'Alice Public Deck',  true);
INSERT INTO public.cards (id, deck_id, front_text, back_text, rank) VALUES
  (1000, 100, 'Q1', 'A1', 1000),
  (1001, 100, 'Q2', 'A2', 2000),
  (1100, 101, 'Q3', 'A3', 1000);

-- Card 1001 has a review due in the future (NOT due).
-- Cards 1000 and 1100 have no review row → considered due.
INSERT INTO public.reviews (id, card_id, due, stability, difficulty)
VALUES (300, 1001, now() + interval '7 days', 1.0, 5.0);

-- Bob: one private deck, one card.
SELECT tests.set_claims('22222222-2222-2222-2222-222222222222'::uuid);
INSERT INTO public.decks (id, title, is_public) VALUES (200, 'Bob Private Deck', false);
INSERT INTO public.cards (id, deck_id, front_text, back_text, rank) VALUES
  (2000, 200, 'Bob Q', 'Bob A', 1000);


-- ── Act as Alice ──────────────────────────────────────────────────────────────
SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
SET LOCAL role = 'authenticated';

-- Test 1: Alice can read her own decks through the view.
SELECT lives_ok(
  $$ SELECT * FROM public.get_member_decks(date_trunc('day', now())) WHERE id IN (100, 101) $$,
  'Alice can read her own decks via get_member_decks'
);

-- Test 2: card_count is accurate on Alice's private deck (2 cards).
SELECT is(
  (SELECT card_count FROM public.get_member_decks(date_trunc('day', now())) WHERE id = 100),
  2,
  'card_count on deck 100 equals 2'
);

-- Test 3: due_count on deck 100 is 1 — card 1000 is due (no review),
-- card 1001 is not (review.due is in the future).
SELECT is(
  (SELECT due_count FROM public.get_member_decks(date_trunc('day', now())) WHERE id = 100),
  1,
  'due_count on deck 100 equals 1 (only card 1000 is currently due)'
);

-- Test 4: due_count on Alice's public deck 101 is 1 — card 1100 has no review.
SELECT is(
  (SELECT due_count FROM public.get_member_decks(date_trunc('day', now())) WHERE id = 101),
  1,
  'due_count on deck 101 equals 1 (card 1100 has no review, so it is due)'
);

-- Test 5: Alice does not see Bob's private deck through the view.
-- If security_invoker were not set, the view would run as postgres and
-- return Bob's row — this assertion would fail.
SELECT is(
  (SELECT count(*) FROM public.get_member_decks(date_trunc('day', now())) WHERE id = 200)::int,
  0,
  'security_invoker: Alice cannot read Bob''s private deck via get_member_decks'
);

-- Test 6: Alice's view row count equals her visible-deck count.
-- Catches accidental join-style duplication where a deck with N cards
-- would return N rows.
SELECT is(
  (SELECT count(*) FROM public.get_member_decks(date_trunc('day', now())) WHERE member_id = '11111111-1111-1111-1111-111111111111')::int,
  2,
  'view row count equals member deck count (no join duplication)'
);


-- ── Act as Bob — test cards_with_images RLS retrofit ─────────────────────────
SET LOCAL role = 'postgres';
SELECT tests.set_claims('22222222-2222-2222-2222-222222222222'::uuid);
SET LOCAL role = 'authenticated';

-- Test 7: Bob cannot see Alice's private card (1000) via cards_with_images.
-- Before the security_invoker retrofit this would return the row.
SELECT is(
  (SELECT count(*) FROM public.cards_with_images WHERE id = 1000)::int,
  0,
  'security_invoker (retrofit): Bob cannot see Alice''s private card via cards_with_images'
);

-- Test 8: Bob CAN see Alice's public card (1100) via cards_with_images —
-- confirms the retrofit only closes the leak and doesn't break the
-- "public decks are readable" path.
SELECT is(
  (SELECT count(*) FROM public.cards_with_images WHERE id = 1100)::int,
  1,
  'Bob can still see Alice''s public deck card via cards_with_images'
);


SELECT * FROM finish();
ROLLBACK;
