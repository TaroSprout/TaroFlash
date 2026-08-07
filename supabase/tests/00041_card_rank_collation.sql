-- =============================================================================
-- cards.rank collation: byte-wise ordering
-- =============================================================================
-- `rank` is `text COLLATE "C"`. This database's default collation is
-- en_US.UTF-8, which reorders case (and would sort 'a0z' before 'a0Z') — but
-- base62 fractional-indexing keys are case-sensitive and must compare
-- byte-wise, matching plain JS string comparison on the client. Under the
-- default collation the server would sort keys differently from what the
-- client intended.
-- =============================================================================

BEGIN;

SELECT plan(2);

SELECT tests.create_user('dddddddd-dddd-dddd-dddd-000000000001'::uuid, 'alice_collation');

SELECT tests.set_claims('dddddddd-dddd-dddd-dddd-000000000001'::uuid);
SET LOCAL role = 'postgres';

INSERT INTO public.decks (id, title, is_public) VALUES (7000, 'Collation Deck', false);

-- Mixed-case keys: under "C" collation, uppercase (0x41-0x5A) sorts strictly
-- before lowercase (0x61-0x7A) — 'a0Z' < 'a0z'. Under en_US collation these
-- reorder (case-insensitive primary compare), which is exactly the bug this
-- guards against.
INSERT INTO public.cards (id, deck_id, front_text, back_text, rank, member_id) VALUES
  (95001, 7000, 'lower', 'lower', 'a0z', 'dddddddd-dddd-dddd-dddd-000000000001'),
  (95002, 7000, 'upper', 'upper', 'a0Z', 'dddddddd-dddd-dddd-dddd-000000000001');

SELECT results_eq(
  $$ SELECT front_text FROM public.cards WHERE deck_id = 7000 ORDER BY rank $$,
  $$ VALUES ('upper'::text), ('lower'::text) $$,
  'ORDER BY rank sorts ''a0Z'' before ''a0z'' — byte-wise, matching client string comparison'
);

-- Confirm the column really is C-collated (not relying on session defaults).
SELECT is(
  (SELECT collation_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cards' AND column_name = 'rank'),
  'C',
  'cards.rank is declared COLLATE "C"'
);

SELECT * FROM finish();
ROLLBACK;
