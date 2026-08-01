-- =============================================================================
-- Study is barred on a locked deck: get_study_session_cards() and
-- get_session_decks_and_cards() both exclude it entirely.
--
-- Covers [obligation]:
--   1. get_study_session_cards() returns zero rows for a locked deck.
--   2. get_session_decks_and_cards() omits a locked deck entirely — no entry
--      in 'decks', no cards — even when its id is passed alongside an
--      unlocked deck.
-- =============================================================================

BEGIN;

SELECT plan(5);

-- ── Setup (as postgres superuser) ─────────────────────────────────────────────

SELECT tests.create_user('e0000000-0000-0000-0000-00000000d001'::uuid, 'study_frank');

SELECT tests.set_claims('e0000000-0000-0000-0000-00000000d001'::uuid);
SET LOCAL role = 'authenticated';

-- 11 decks: 700-709 unlocked (top 10 by rank), 710 locked (11th).
INSERT INTO public.decks (id, title, is_public) VALUES
  (700, 'Frank deck 700', false),
  (701, 'Frank deck 701', false),
  (702, 'Frank deck 702', false),
  (703, 'Frank deck 703', false),
  (704, 'Frank deck 704', false),
  (705, 'Frank deck 705', false),
  (706, 'Frank deck 706', false),
  (707, 'Frank deck 707', false),
  (708, 'Frank deck 708', false),
  (709, 'Frank deck 709', false),
  (710, 'Frank deck 710', false);

-- New (unreviewed) cards on both the soon-to-be-unlocked deck (700) and the
-- soon-to-be-locked deck (710) — proves the empty result on 710 is the lock,
-- not just an empty deck.
INSERT INTO public.cards (id, deck_id, front_text, back_text, rank) VALUES
  (7000, 700, 'D700 Q1', 'A1', 1000),
  (7100, 710, 'D710 Q1', 'A1', 1000);

SET LOCAL role = 'postgres';

-- Stamp the grace deadline (11 decks > the free deck_limit of 10).
SELECT public.begin_downgrade_grace('e0000000-0000-0000-0000-00000000d001'::uuid);

SELECT tests.set_claims('e0000000-0000-0000-0000-00000000d001'::uuid);
SET LOCAL role = 'authenticated';


-- ── get_study_session_cards [obligation] ──────────────────────────────────────

-- Test 1: the locked deck yields no study cards, despite having one available.
SELECT is(
  (
    SELECT count(*)::int
    FROM public.get_study_session_cards(710, date_trunc('day', now()))
  ),
  0,
  'get_study_session_cards() returns zero rows for a locked deck [obligation]'
);


-- ── get_session_decks_and_cards [obligation] ──────────────────────────────────

-- Test 2: the locked deck has no entry in 'decks' ...
SELECT is(
  (
    SELECT count(*)::int
    FROM jsonb_array_elements(
      (public.get_session_decks_and_cards(ARRAY[700, 710], date_trunc('day', now())))->'decks'
    ) AS d
    WHERE (d->>'id')::int = 710
  ),
  0,
  'get_session_decks_and_cards() omits a locked deck from ''decks'' [obligation]'
);

-- Test 3: ... nor any cards.
SELECT is(
  (
    SELECT count(*)::int
    FROM jsonb_array_elements(
      (public.get_session_decks_and_cards(ARRAY[700, 710], date_trunc('day', now())))->'cards'
    ) AS c
    WHERE (c->>'deck_id')::int = 710
  ),
  0,
  'get_session_decks_and_cards() omits a locked deck''s cards [obligation]'
);

-- Test 4: the unlocked deck passed alongside it is unaffected.
SELECT is(
  (
    SELECT count(*)::int
    FROM jsonb_array_elements(
      (public.get_session_decks_and_cards(ARRAY[700, 710], date_trunc('day', now())))->'decks'
    ) AS d
    WHERE (d->>'id')::int = 700
  ),
  1,
  'get_session_decks_and_cards() still includes the unlocked deck alongside the locked one'
);

-- Test 5: ... and its cards still come through.
SELECT is(
  (
    SELECT count(*)::int
    FROM jsonb_array_elements(
      (public.get_session_decks_and_cards(ARRAY[700, 710], date_trunc('day', now())))->'cards'
    ) AS c
    WHERE (c->>'deck_id')::int = 700
  ),
  1,
  'get_session_decks_and_cards() still includes the unlocked deck''s cards'
);

SELECT * FROM finish();
ROLLBACK;
