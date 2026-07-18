-- =============================================================================
-- resolve_deck_pacing (direct) + get_session_decks_and_cards RPC
--
-- Covers [obligation]:
--   1. resolve_deck_pacing ladder, called directly (not via get_member_decks):
--      pinned override wins (including pinned-null = uncapped for caps),
--      else linked preset, else system preset.
--   2. get_session_decks_and_cards returns decks in the requested order.
--   3. get_session_decks_and_cards returns cards grouped by deck, in requested
--      deck order, with each card's review embedded (null when unreviewed).
--   4. RLS runs as invoker — a member requesting a foreign deck id gets no
--      rows for that deck (neither in decks nor cards).
-- =============================================================================

BEGIN;

SELECT plan(17);

-- ── Setup ─────────────────────────────────────────────────────────────────────

SELECT tests.create_user('c1111111-1111-1111-1111-111111111111'::uuid, 'carol_session');
SELECT tests.create_user('d2222222-2222-2222-2222-222222222222'::uuid, 'dave_session');

SELECT tests.set_claims('c1111111-1111-1111-1111-111111111111'::uuid);
SET LOCAL role = 'authenticated';

-- A custom preset with an explicit max_reviews_per_day and a NULL max_interval
-- (this preset's own "unbounded" for max_interval).
INSERT INTO public.review_pacing_presets (id, name, desired_retention, learning_steps, relearning_steps, max_reviews_per_day, max_interval)
VALUES (9600, 'Session Test Preset', 93, ARRAY['2m'], ARRAY['20m'], 50, 120);

-- Deck 400: no preset, no override -> resolves to the system preset entirely.
INSERT INTO public.decks (id, title, is_public) VALUES (400, 'No preset, no override', false);

-- Deck 401: linked to the custom preset, with desired_retention pinned via
-- override (wins over the preset) and max_interval pinned to null (uncapped,
-- winning over the preset's own numeric cap of 120).
INSERT INTO public.decks (id, title, is_public) VALUES (401, 'Preset + pinned override + pinned-null cap', false);
INSERT INTO public.deck_review_pacing (deck_id, review_pacing_preset_id, overrides)
VALUES (401, 9600, '{"desired_retention": 99, "max_interval": null}'::jsonb);

INSERT INTO public.cards (id, deck_id, front_text, back_text, rank) VALUES
  (4000, 400, 'D400 Q1', 'A1', 1000),
  (4001, 400, 'D400 Q2', 'A2', 2000),
  (4010, 401, 'D401 Q1', 'A1', 1000);

-- 4000 has an existing review (embedded, not null); 4001 and 4010 are new
-- (unreviewed) — their embedded review must be null.
INSERT INTO public.reviews (id, card_id, due, stability, difficulty)
VALUES (500, 4000, now() - interval '1 day', 1.0, 5.0);

-- Deck 403: explicit starting_side: 'random' — proves the RPC passes the
-- value through verbatim rather than coercing it to a boolean-derived side.
INSERT INTO public.decks (id, title, is_public, study_config)
VALUES (403, 'Random starting side', false, '{"starting_side": "random"}'::jsonb);

-- Dave has his own deck — used to confirm RLS isolation.
SET LOCAL role = 'postgres';
SELECT tests.set_claims('d2222222-2222-2222-2222-222222222222'::uuid);
SET LOCAL role = 'authenticated';
INSERT INTO public.decks (id, title, is_public) VALUES (402, 'Dave Deck', false);
INSERT INTO public.cards (id, deck_id, front_text, back_text, rank) VALUES
  (4020, 402, 'Dave Q', 'Dave A', 1000);


-- ── resolve_deck_pacing ladder, called directly [obligation] ─────────────────

SET LOCAL role = 'postgres';
SELECT tests.set_claims('c1111111-1111-1111-1111-111111111111'::uuid);
SET LOCAL role = 'authenticated';

-- Test 1: deck 400 (no preset, no override) desired_retention resolves to the
-- system preset when calling resolve_deck_pacing directly.
SELECT is(
  (SELECT (public.resolve_deck_pacing(400)).desired_retention),
  90,
  'resolve_deck_pacing(400) desired_retention resolves to the system preset [obligation]'
);

-- Test 2: deck 401's pinned desired_retention override (99) wins over the
-- linked preset's own value (93).
SELECT is(
  (SELECT (public.resolve_deck_pacing(401)).desired_retention),
  99,
  'resolve_deck_pacing(401) desired_retention resolves to the pinned override, not the linked preset [obligation]'
);

-- Test 3: deck 401's unpinned learning_steps still resolves to the linked
-- preset's value — proves the pin is scoped to the one field.
SELECT is(
  (SELECT (public.resolve_deck_pacing(401)).learning_steps),
  ARRAY['2m'],
  'resolve_deck_pacing(401) learning_steps (unpinned) resolves to the linked preset [obligation]'
);

-- Test 4 [obligation]: deck 401's pinned-null max_interval override wins over
-- the linked preset's own numeric cap (120) — resolves to NULL (uncapped).
SELECT is(
  (SELECT (public.resolve_deck_pacing(401)).max_interval),
  NULL::int,
  'resolve_deck_pacing(401) pinned-null max_interval override resolves to NULL, not the preset''s cap [obligation]'
);

-- Test 5: deck 401's unpinned max_reviews_per_day still resolves to the
-- linked preset's concrete value (50).
SELECT is(
  (SELECT (public.resolve_deck_pacing(401)).max_reviews_per_day),
  50,
  'resolve_deck_pacing(401) max_reviews_per_day (unpinned) resolves to the linked preset [obligation]'
);


-- ── get_session_decks_and_cards — deck order [obligation] ────────────────────

-- Test 6: decks come back in the requested order (401 first, then 400), not
-- id order or insertion order.
SELECT is(
  (
    SELECT jsonb_agg(d->>'id')
    FROM jsonb_array_elements(
      (public.get_session_decks_and_cards(ARRAY[401, 400], date_trunc('day', now())))->'decks'
    ) AS d
  ),
  '["401", "400"]'::jsonb,
  'get_session_decks_and_cards returns decks in the requested order [obligation]'
);

-- Test 7: the resolved deck record carries resolve_deck_pacing's ladder
-- output, not raw deck columns — deck 401's desired_retention is the pinned
-- override (99), proving the RPC's per-deck resolution reuses the same
-- shared resolver.
SELECT is(
  (
    SELECT (d->>'desired_retention')::int
    FROM jsonb_array_elements(
      (public.get_session_decks_and_cards(ARRAY[401], date_trunc('day', now())))->'decks'
    ) AS d
  ),
  99,
  'get_session_decks_and_cards deck record resolves pacing via resolve_deck_pacing [obligation]'
);

-- Test 8: cards are grouped by deck in the requested deck order — deck 401's
-- card (4010) comes before deck 400's cards, even though deck 400 has the
-- lower id. Within deck 400, [4000, 4001] is get_study_session_cards' own
-- interleave order (review-due card 4000, then new card 4001) — this test
-- only pins the cross-deck grouping, not the intra-deck interleave (that's
-- get_study_session_cards' own concern, covered in 00012).
SELECT is(
  (
    SELECT jsonb_agg((c->>'id')::int)
    FROM jsonb_array_elements(
      (public.get_session_decks_and_cards(ARRAY[401, 400], date_trunc('day', now())))->'cards'
    ) AS c
  ),
  '[4010, 4000, 4001]'::jsonb,
  'get_session_decks_and_cards groups cards by deck in the requested deck order [obligation]'
);

-- Test 9 [obligation]: each card's review is embedded — null for an
-- unreviewed card (4001), non-null for a card with an existing review (4000).
SELECT is(
  (
    SELECT c->'review'
    FROM jsonb_array_elements(
      (public.get_session_decks_and_cards(ARRAY[400], date_trunc('day', now())))->'cards'
    ) AS c
    WHERE (c->>'id')::int = 4001
  ),
  'null'::jsonb,
  'get_session_decks_and_cards embeds a null review for an unreviewed card [obligation]'
);

SELECT ok(
  (
    SELECT c->'review' IS NOT NULL AND (c->'review')->>'id' IS NOT NULL
    FROM jsonb_array_elements(
      (public.get_session_decks_and_cards(ARRAY[400], date_trunc('day', now())))->'cards'
    ) AS c
    WHERE (c->>'id')::int = 4000
  ),
  'get_session_decks_and_cards embeds the real review row for a reviewed card [obligation]'
);


-- ── starting_side pass-through [obligation] ──────────────────────────────────

-- Test 13 [obligation]: the resolved deck record carries starting_side, not
-- the retired flip_cards key.
SELECT is(
  (
    SELECT (d->>'starting_side')
    FROM jsonb_array_elements(
      (public.get_session_decks_and_cards(ARRAY[400], date_trunc('day', now())))->'decks'
    ) AS d
  ),
  'front',
  'get_session_decks_and_cards deck record carries starting_side [obligation]'
);

SELECT ok(
  NOT (
    SELECT d ? 'flip_cards'
    FROM jsonb_array_elements(
      (public.get_session_decks_and_cards(ARRAY[400], date_trunc('day', now())))->'decks'
    ) AS d
  ),
  'get_session_decks_and_cards deck record no longer carries flip_cards [obligation]'
);

-- Test 14 [obligation]: 'random' passes through verbatim, not coerced to
-- 'front'/'back'.
SELECT is(
  (
    SELECT (d->>'starting_side')
    FROM jsonb_array_elements(
      (public.get_session_decks_and_cards(ARRAY[403], date_trunc('day', now())))->'decks'
    ) AS d
  ),
  'random',
  'get_session_decks_and_cards passes starting_side: "random" through verbatim [obligation]'
);

-- ── RLS as invoker [obligation] ──────────────────────────────────────────────

-- Test 10 [obligation]: Carol requesting Dave's deck (402) alongside her own
-- (400) gets no rows for Dave's deck in either decks or cards — RLS runs as
-- invoker, scoping every embedded table to Carol's own rows.
SELECT is(
  (
    SELECT count(*)::int
    FROM jsonb_array_elements(
      (public.get_session_decks_and_cards(ARRAY[400, 402], date_trunc('day', now())))->'decks'
    ) AS d
    WHERE (d->>'id')::int = 402
  ),
  0,
  'get_session_decks_and_cards: a foreign deck id yields no rows in decks (RLS as invoker) [obligation]'
);

SELECT is(
  (
    SELECT count(*)::int
    FROM jsonb_array_elements(
      (public.get_session_decks_and_cards(ARRAY[400, 402], date_trunc('day', now())))->'cards'
    ) AS c
    WHERE (c->>'deck_id')::int = 402
  ),
  0,
  'get_session_decks_and_cards: a foreign deck id yields no rows in cards (RLS as invoker) [obligation]'
);

-- Test 11: Carol's own deck's cards are still returned when a foreign deck id
-- is mixed into the same request — the foreign id doesn't blank the whole
-- response.
SELECT is(
  (
    SELECT count(*)::int
    FROM jsonb_array_elements(
      (public.get_session_decks_and_cards(ARRAY[400, 402], date_trunc('day', now())))->'cards'
    ) AS c
    WHERE (c->>'deck_id')::int = 400
  ),
  2,
  'get_session_decks_and_cards: the caller''s own deck cards are unaffected by a foreign id in the same request'
);

-- Test 12: requesting only a foreign deck id returns empty decks and cards
-- arrays (not an error).
SELECT is(
  (public.get_session_decks_and_cards(ARRAY[402], date_trunc('day', now()))),
  '{"decks": [], "cards": []}'::jsonb,
  'get_session_decks_and_cards requesting only a foreign deck id returns empty arrays, not an error [obligation]'
);

SELECT * FROM finish();
ROLLBACK;
