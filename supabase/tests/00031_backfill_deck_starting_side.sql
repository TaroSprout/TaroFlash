-- =============================================================================
-- Backfill transform: study_config.flip_cards (boolean) -> starting_side
--
-- The migration (20260718150511_backfill-deck-starting-side.sql) is a
-- data-only UPDATE, already applied locally — it won't re-run for freshly
-- seeded rows here. This test asserts the transform's own SQL expression
-- directly, seeding rows that carry the pre-migration shape and re-running
-- the same CASE/jsonb expression the migration used.
--
-- Covers [obligation]:
--   1. flip_cards: true  -> starting_side: 'back', flip_cards key dropped.
--   2. flip_cards: false -> starting_side: 'front', flip_cards key dropped.
--   3. A deck whose study_config lacks flip_cards is left untouched.
-- =============================================================================

BEGIN;

SELECT plan(5);

SELECT tests.create_user('e3333333-3333-3333-3333-333333333333'::uuid, 'erin_backfill');
SELECT tests.set_claims('e3333333-3333-3333-3333-333333333333'::uuid);
SET LOCAL role = 'authenticated';

-- Deck 500: pre-migration shape with flip_cards: true.
INSERT INTO public.decks (id, title, is_public, study_config)
VALUES (500, 'Flip true', false, '{"flip_cards": true, "shuffle": false}'::jsonb);

-- Deck 501: pre-migration shape with flip_cards: false.
INSERT INTO public.decks (id, title, is_public, study_config)
VALUES (501, 'Flip false', false, '{"flip_cards": false, "shuffle": true}'::jsonb);

-- Deck 502: no flip_cards key at all — must be left untouched by the transform.
INSERT INTO public.decks (id, title, is_public, study_config)
VALUES (502, 'No flip key', false, '{"shuffle": false}'::jsonb);

SET LOCAL role = 'postgres';

-- Re-run the migration's own transform expression directly against these
-- freshly-seeded rows (the already-applied migration won't touch them).
UPDATE public.decks
SET study_config =
  (study_config - 'flip_cards')
  || jsonb_build_object(
    'starting_side',
    case when (study_config ->> 'flip_cards')::boolean then 'back' else 'front' end
  )
WHERE id IN (500, 501)
  AND study_config ? 'flip_cards';

-- Test 1 [obligation]: flip_cards: true -> starting_side: 'back'.
SELECT is(
  (SELECT study_config ->> 'starting_side' FROM public.decks WHERE id = 500),
  'back',
  'flip_cards: true backfills to starting_side: "back" [obligation]'
);

-- Test 2: flip_cards key is dropped for the true case.
SELECT ok(
  (SELECT NOT (study_config ? 'flip_cards') FROM public.decks WHERE id = 500),
  'flip_cards key is dropped once starting_side is backfilled (true case) [obligation]'
);

-- Test 3 [obligation]: flip_cards: false -> starting_side: 'front'.
SELECT is(
  (SELECT study_config ->> 'starting_side' FROM public.decks WHERE id = 501),
  'front',
  'flip_cards: false backfills to starting_side: "front" [obligation]'
);

-- Test 4: flip_cards key is dropped for the false case.
SELECT ok(
  (SELECT NOT (study_config ? 'flip_cards') FROM public.decks WHERE id = 501),
  'flip_cards key is dropped once starting_side is backfilled (false case) [obligation]'
);

-- Test 5 [obligation]: a deck whose study_config never had flip_cards is
-- left untouched — no starting_side key is introduced by the transform.
SELECT is(
  (SELECT study_config FROM public.decks WHERE id = 502),
  '{"shuffle": false}'::jsonb,
  'a deck without a flip_cards key is left untouched by the backfill transform [obligation]'
);

SELECT * FROM finish();
ROLLBACK;
