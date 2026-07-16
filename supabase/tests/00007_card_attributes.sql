-- =============================================================================
-- Tests for the card_defaults → card_attributes rename and the view
-- projection that exposes it to the dashboard.
--
-- Covers:
--   1. The column was renamed (old name gone, new name present).
--   2. get_member_decks returns card_attributes.
--   3. The projection survives round-tripping a nested {front,back} shape.
-- =============================================================================

BEGIN;

SELECT plan(4);

-- ── Structure: rename happened ────────────────────────────────────────────────

SELECT hasnt_column(
  'public', 'decks', 'card_defaults',
  'decks.card_defaults was removed by the rename migration'
);

SELECT has_column(
  'public', 'decks', 'card_attributes',
  'decks.card_attributes exists after the rename migration'
);


-- ── View: includes card_attributes in projection ──────────────────────────────

SELECT tests.create_user('33333333-3333-3333-3333-333333333333'::uuid, 'charlie_attrs');
SELECT tests.set_claims('33333333-3333-3333-3333-333333333333'::uuid);

INSERT INTO public.decks (id, title, is_public, card_attributes)
VALUES (
  900,
  'Attrs Deck',
  false,
  jsonb_build_object(
    'front', jsonb_build_object('text_size', 'huge', 'horizontal_alignment', 'left'),
    'back',  jsonb_build_object('text_size', 'small')
  )
);

SET LOCAL role = 'authenticated';

SELECT results_eq(
  $$
    SELECT card_attributes
    FROM public.get_member_decks(date_trunc('day', now()))
    WHERE id = 900
  $$,
  $$
    VALUES (
      jsonb_build_object(
        'front', jsonb_build_object('text_size', 'huge', 'horizontal_alignment', 'left'),
        'back',  jsonb_build_object('text_size', 'small')
      )
    )
  $$,
  'get_member_decks returns the nested {front,back} card_attributes shape'
);

-- Null card_attributes should surface as null (not crash the projection)
SET LOCAL role = 'postgres';

INSERT INTO public.decks (id, title, is_public, card_attributes)
VALUES (901, 'No Attrs', false, NULL);

SELECT tests.set_claims('33333333-3333-3333-3333-333333333333'::uuid);
SET LOCAL role = 'authenticated';

SELECT results_eq(
  $$
    SELECT card_attributes IS NULL
    FROM public.get_member_decks(date_trunc('day', now()))
    WHERE id = 901
  $$,
  $$ VALUES (true) $$,
  'get_member_decks returns NULL card_attributes when the column is NULL'
);


SELECT * FROM finish();
ROLLBACK;
