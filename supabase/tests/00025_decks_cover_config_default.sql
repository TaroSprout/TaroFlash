-- =============================================================================
-- decks.cover_config default: a deck inserted without cover_config should get
-- the blue/diagonal-stripes/symbol-spades palette fallback, not null. A deck
-- that explicitly supplies its own cover_config keeps it.
-- =============================================================================

BEGIN;

SELECT plan(3);

-- ── Setup ─────────────────────────────────────────────────────────────────────

SELECT tests.create_user('33333333-3333-3333-3333-333333333333'::uuid, 'carol_cover');

SELECT tests.set_claims('33333333-3333-3333-3333-333333333333'::uuid);
SET LOCAL role = 'authenticated';

-- Test 1: omitting cover_config lands with the DB-level default, not null.
INSERT INTO public.decks (id, title) VALUES (300, 'Carol Default Cover Deck');

SELECT is(
  (SELECT cover_config FROM public.decks WHERE id = 300),
  '{
    "palette": "blue",
    "pattern": "diagonal-stripes",
    "icon": "symbol-spades"
  }'::jsonb,
  'deck inserted without cover_config gets the default cover, not null'
);

-- Test 2: explicitly supplying cover_config is not overwritten by the default.
INSERT INTO public.decks (id, title, cover_config) VALUES (
  301,
  'Carol Custom Cover Deck',
  '{
    "palette": "green",
    "pattern": "polka-dots",
    "icon": "symbol-clubs"
  }'::jsonb
);

SELECT is(
  (SELECT cover_config FROM public.decks WHERE id = 301),
  '{
    "palette": "green",
    "pattern": "polka-dots",
    "icon": "symbol-clubs"
  }'::jsonb,
  'deck inserted with an explicit cover_config keeps it, not overwritten by the default'
);

-- Test 3: the column default itself is the expected jsonb (proxy for backfill
-- correctness, since existing rows in this DB were already backfilled by the
-- migration and re-nulling a row to retest backfill semantics isn't practical).
SET LOCAL role = 'postgres';

-- column_default is the literal SQL text (e.g. `'{"icon": "symbol-spades", ...}'::jsonb`),
-- not a jsonb value itself, so evaluate it to compare as real jsonb.
DO $$
DECLARE
  default_sql text;
  evaluated jsonb;
BEGIN
  SELECT column_default INTO default_sql
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'decks'
    AND column_name = 'cover_config';

  EXECUTE format('SELECT %s', default_sql) INTO evaluated;

  PERFORM set_config('tests.decks_cover_config_default', evaluated::text, true);
END;
$$;

SELECT is(
  current_setting('tests.decks_cover_config_default')::jsonb,
  '{
    "palette": "blue",
    "pattern": "diagonal-stripes",
    "icon": "symbol-spades"
  }'::jsonb,
  'decks.cover_config column default is set to the fallback cover'
);

SELECT * FROM finish();
ROLLBACK;
