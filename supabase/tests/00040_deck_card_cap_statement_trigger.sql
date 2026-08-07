-- =============================================================================
-- Per-deck card cap: STATEMENT-level trigger tests
-- =============================================================================
-- assert_deck_card_limits fires from AFTER STATEMENT triggers (with transition
-- tables), not AFTER EACH ROW. That's the whole point: a bulk move of N cards
-- is one UPDATE statement, and a BEFORE-ROW trigger's count(*) can't see rows
-- changed by its own statement — every row would read the same pre-move count,
-- so an over-cap bulk move would pass the check on every row and only the
-- deck's final state would reveal the overshoot. The STATEMENT-level trigger
-- counts once, after the whole statement has landed, and rejects it as a unit.
--
-- Test plan index:
--   1  a bulk move that would push a deck over cap is rejected with PT402
--   2  the rejected bulk move is atomic — none of the cards land in the target
--   3  the rejected bulk move leaves the target deck's count unchanged
--   4  editing card text in an over-cap deck still succeeds (deck_id unchanged)
--   5  moving cards OUT of an over-cap deck still succeeds
-- =============================================================================

BEGIN;

SELECT plan(5);

SELECT tests.create_user('cccccccc-cccc-cccc-cccc-000000000001'::uuid, 'alice_cap');

SELECT tests.set_claims('cccccccc-cccc-cccc-cccc-000000000001'::uuid);

INSERT INTO public.decks (id, title, is_public) VALUES
  (6000, 'Near Cap Target', false),
  (6001, 'Bulk Move Source', false),
  (6002, 'Over Cap Deck',    false),
  (6003, 'Edit Target (still over cap)', false);

-- Near-cap target: 498 cards (2 under the free limit of 500).
INSERT INTO public.cards (deck_id, front_text, back_text, rank, member_id)
SELECT 6000, 'NearCap' || gs, 'NC' || gs, 'a' || lpad(gs::text, 5, '0'),
       'cccccccc-cccc-cccc-cccc-000000000001'::uuid
FROM generate_series(1, 498) AS gs;

-- 5 cards to bulk-move into 6000 — would land it at 503, over the 500 cap.
INSERT INTO public.cards (id, deck_id, front_text, back_text, rank, member_id)
SELECT 90000 + gs, 6001, 'Bulk' || gs, 'B' || gs, 'a' || lpad(gs::text, 5, '0'),
       'cccccccc-cccc-cccc-cccc-000000000001'::uuid
FROM generate_series(1, 5) AS gs;

-- Deck already over cap (a plan downgrade can leave a deck above its new
-- limit) — filled while Alice is briefly on the unlimited paid plan, since a
-- free-plan insert could never get a deck over its own cap in the first place.
SET LOCAL role = 'postgres';
UPDATE public.members SET plan = 'paid'
 WHERE id = 'cccccccc-cccc-cccc-cccc-000000000001';

INSERT INTO public.cards (deck_id, front_text, back_text, rank, member_id)
SELECT 6002, 'OverCap' || gs, 'OC' || gs, 'a' || lpad(gs::text, 5, '0'),
       'cccccccc-cccc-cccc-cccc-000000000001'::uuid
FROM generate_series(1, 501) AS gs;

INSERT INTO public.cards (id, deck_id, front_text, back_text, rank, member_id) VALUES
  (91000, 6002, 'Edit Me', 'Edit Me', 'z9', 'cccccccc-cccc-cccc-cccc-000000000001');

-- Back to free for the actual cap-enforcement assertions below.
UPDATE public.members SET plan = 'free'
 WHERE id = 'cccccccc-cccc-cccc-cccc-000000000001';


-- ── Test 1 + 2 + 3: bulk move over cap is rejected as a unit ──────────────────

SELECT tests.set_claims('cccccccc-cccc-cccc-cccc-000000000001'::uuid);
SET LOCAL role = 'authenticated';

SELECT throws_ok(
  $$ SELECT public.move_cards_to_deck(
       p_target_deck_id := 6000,
       p_ranks          := ARRAY['z0', 'z1', 'z2', 'z3', 'z4']::text[],
       p_card_ids       := ARRAY[90001, 90002, 90003, 90004, 90005]::bigint[]
     ) $$,
  'PT402',
  'deck_card_limit_exceeded',
  'a bulk move that would push a deck over cap is rejected with PT402'
);

SET LOCAL role = 'postgres';

SELECT is(
  (SELECT count(*)::int FROM public.cards
    WHERE deck_id = 6000 AND id = ANY(ARRAY[90001, 90002, 90003, 90004, 90005])),
  0,
  'the rejected bulk move is atomic — none of the 5 cards land in the target deck'
);

SELECT is(
  (SELECT count(*)::int FROM public.cards WHERE deck_id = 6000),
  498,
  'the rejected bulk move leaves the target deck''s count unchanged (still 498)'
);


-- ── Test 4: editing text in an over-cap deck still succeeds ───────────────────
-- 6002 already sits at 501 cards, over the 500 free cap. The update trigger
-- only checks decks where deck_id changed — a text-only edit is filtered out.

SET LOCAL role = 'authenticated';

SELECT lives_ok(
  $$ UPDATE public.cards SET front_text = 'Edited' WHERE id = 91000 $$,
  'editing card text in an over-cap deck still succeeds'
);


-- ── Test 5: moving cards OUT of an over-cap deck still succeeds ───────────────
-- The cap check only fires for decks a card lands IN; moving 91000 out of the
-- over-cap deck 6002 doesn't add to any deck at/over its cap.

INSERT INTO public.decks (id, title, is_public) VALUES (6004, 'Out Target', false);

SELECT lives_ok(
  $$ SELECT public.move_cards_to_deck(
       p_target_deck_id := 6004,
       p_ranks          := ARRAY['a0']::text[],
       p_card_ids       := ARRAY[91000]::bigint[]
     ) $$,
  'moving a card OUT of an over-cap deck still succeeds'
);


SELECT * FROM finish();
ROLLBACK;
