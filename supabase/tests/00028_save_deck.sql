-- =============================================================================
-- save_deck: single write RPC for deck-settings save
-- Introduced in 20260716000006_save-deck.sql
--
-- Covers:
--   1. p_deck_id NULL creates a new deck (member_id + rank populated by
--      decks' own BEFORE INSERT triggers) and its deck_review_pacing sidecar
--      row.
--   2. p_deck_id set updates the existing deck.
--   3. p_deck_id belonging to another member (or a nonexistent id) raises
--      an exception rather than silently no-op'ing.
--   4. The deck_review_pacing upsert uses ON CONFLICT (deck_id) DO UPDATE —
--      calling save_deck twice on the same deck updates pacing rather than
--      erroring.
--   5. The function returns the fully resolved deck shape (same columns as
--      get_member_decks) in one call.
--   6. INSERT...RETURNING re-checks the SELECT policy on the new row — the
--      create path's returned row is actually visible to the creating
--      member (the trigger-set member_id satisfies decks' SELECT policy
--      before RETURNING runs).
-- =============================================================================

BEGIN;

SELECT plan(12);

SELECT tests.create_user('a1111111-1111-1111-1111-111111111111'::uuid, 'alice_save_deck');
SELECT tests.create_user('b2222222-2222-2222-2222-222222222222'::uuid, 'bob_save_deck');

SELECT tests.set_claims('a1111111-1111-1111-1111-111111111111'::uuid);
SET LOCAL role = 'authenticated';

-- ── Create path (p_deck_id NULL) ──────────────────────────────────────────────

SELECT lives_ok(
  $$
    SELECT * FROM public.save_deck(
      NULL, 'Smoke Test Deck', NULL, true, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
      NULL, NULL, NULL, NULL,
      false, NULL, false, NULL
    )
  $$,
  'save_deck with p_deck_id NULL creates a new deck without raising'
);

-- Capture the id of a fresh create-path call so the following assertions
-- target this exact row (never a title lookup — titles aren't unique).
SELECT id AS v_new_deck_id FROM public.save_deck(
  NULL, 'New Deck', NULL, true, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
  NULL, NULL, NULL, NULL,
  false, NULL, false, NULL
) \gset

-- Test 2: the created deck's member_id was populated by decks' own trigger,
-- not passed explicitly — proving the create path relies on set_member_id().
SELECT is(
  (SELECT member_id FROM public.decks WHERE id = :v_new_deck_id),
  'a1111111-1111-1111-1111-111111111111'::uuid,
  'created deck member_id is stamped by the BEFORE INSERT trigger'
);

-- Test 3: the created deck's rank was populated by set_deck_rank(), not NULL
-- (decks.rank is NOT NULL with no column default).
SELECT isnt(
  (SELECT rank FROM public.decks WHERE id = :v_new_deck_id),
  NULL::numeric,
  'created deck rank is stamped by the BEFORE INSERT trigger'
);

-- Test 4: a deck_review_pacing sidecar row was created alongside it.
SELECT is(
  (SELECT count(*)::int FROM public.deck_review_pacing WHERE deck_id = :v_new_deck_id),
  1,
  'save_deck creates the deck_review_pacing sidecar row on the create path'
);

-- Test 5 [obligation]: the create path's returned row is visible to the
-- creating member — INSERT...RETURNING re-checks decks' SELECT policy on
-- the new row (trigger-set member_id must satisfy it before RETURNING runs).
SELECT is(
  (SELECT title FROM public.save_deck(
      NULL, 'Visible Deck', NULL, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
      NULL, NULL, NULL, NULL,
      false, NULL, false, NULL
    )),
  'Visible Deck',
  'the created deck row is visible to the creating member via RETURNING [obligation]'
);

-- Test 6: the returned row carries the same resolved shape as get_member_decks
-- (proven by asserting a resolved-ladder column resolves to the system
-- default on a deck with no preset and no override — desired_retention).
SELECT is(
  (SELECT desired_retention FROM public.save_deck(
      NULL, 'Resolved Shape Deck', NULL, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
      NULL, NULL, NULL, NULL,
      false, NULL, false, NULL
    )),
  (SELECT desired_retention FROM public.review_pacing_presets WHERE is_system),
  'save_deck returns the fully resolved deck shape (same as get_member_decks) in one call'
);


-- ── Update path (p_deck_id set) ───────────────────────────────────────────────

-- Save an existing deck for Alice to update.
INSERT INTO public.decks (id, title, is_public) VALUES (500, 'Original Title', false);

SELECT is(
  (SELECT title FROM public.save_deck(
      500, 'Updated Title', 'new description', true, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
      NULL, 88, NULL, NULL,
      true, 25, false, NULL
    )),
  'Updated Title',
  'save_deck with p_deck_id set updates the existing deck row'
);

-- Test 8: the pacing override values were written to deck_review_pacing.
SELECT is(
  (SELECT max_reviews_per_day_override FROM public.deck_review_pacing WHERE deck_id = 500),
  25,
  'save_deck writes has_max_reviews_override / max_reviews_per_day_override to deck_review_pacing'
);

-- Test 9 [obligation]: calling save_deck a second time on the same deck
-- updates the pacing row (ON CONFLICT (deck_id) DO UPDATE) rather than
-- erroring on a duplicate-key violation.
SELECT lives_ok(
  $$
    SELECT * FROM public.save_deck(
      500, 'Updated Title Again', NULL, true, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
      NULL, 60, NULL, NULL,
      true, 40, false, NULL
    )
  $$,
  'calling save_deck twice on the same deck does not raise a duplicate-key error [obligation]'
);

SELECT is(
  (SELECT max_reviews_per_day_override FROM public.deck_review_pacing WHERE deck_id = 500),
  40,
  'the second save_deck call updates deck_review_pacing rather than duplicating it'
);


-- ── Ownership guard [obligation] ──────────────────────────────────────────────

-- Test 11a: updating a nonexistent deck id raises rather than silently no-op'ing.
SELECT throws_ok(
  $$
    SELECT * FROM public.save_deck(
      999999, 'Ghost', NULL, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
      NULL, NULL, NULL, NULL,
      false, NULL, false, NULL
    )
  $$,
  'P0001',
  NULL,
  'save_deck raises when p_deck_id does not exist, rather than silently no-op''ing [obligation]'
);

-- Bob's deck — Alice attempts to update it via save_deck. member_id must be
-- stamped by set_member_id() (auth.uid()) under Bob's own claims — the
-- trigger unconditionally overwrites any explicit member_id passed in the
-- INSERT, so this can't be faked from the 'postgres' role.
SET LOCAL role = 'postgres';
SELECT tests.set_claims('b2222222-2222-2222-2222-222222222222'::uuid);
SET LOCAL role = 'authenticated';
INSERT INTO public.decks (id, title, is_public) VALUES (600, 'Bob''s Deck', false);

SET LOCAL role = 'postgres';
SELECT tests.set_claims('a1111111-1111-1111-1111-111111111111'::uuid);
SET LOCAL role = 'authenticated';

-- Test 11b: updating another member's deck raises rather than silently
-- no-op'ing — RLS filters the UPDATE to zero rows, RETURNING leaves
-- v_deck_id NULL, and the function raises.
SELECT throws_ok(
  $$
    SELECT * FROM public.save_deck(
      600, 'Hijacked', NULL, false, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
      NULL, NULL, NULL, NULL,
      false, NULL, false, NULL
    )
  $$,
  'P0001',
  NULL,
  'save_deck raises when p_deck_id belongs to another member [obligation]'
);

SELECT * FROM finish();
ROLLBACK;
