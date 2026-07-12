-- =============================================================================
-- Trigger tests: set_member_id, set_deck_rank, dedupe_media_slot_on_insert
--
-- The update_deck_card_count trigger + decks.card_count column were removed
-- in 20260416000002_drop-deck-card-count-column.sql — per-deck counts are
-- now computed live in the decks_with_stats view (see 00009_decks_with_stats.sql).
-- =============================================================================

BEGIN;

SELECT plan(8);

-- ── Setup ─────────────────────────────────────────────────────────────────────

SELECT tests.create_user('11111111-1111-1111-1111-111111111111'::uuid, 'alice_triggers');

-- The media dedupe tests below INSERT card-image rows as the authenticated user,
-- which the paywall policy (20260606000002) gates on plan='paid'. Put Alice on
-- the paid plan so those inserts exercise the trigger rather than tripping RLS.
UPDATE public.members SET plan = 'paid' WHERE id = '11111111-1111-1111-1111-111111111111';

SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
INSERT INTO public.decks (id, title, is_public) VALUES (100, 'Alice Deck', false);


-- ── set_member_id trigger ─────────────────────────────────────────────────────

-- Test 1: Deck insert stamps correct member_id
SELECT is(
  (SELECT member_id FROM public.decks WHERE id = 100),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'set_member_id trigger stamps auth.uid() on deck insert'
);

-- Test 2: Card insert stamps correct member_id
SET LOCAL role = 'authenticated';

INSERT INTO public.cards (id, deck_id, front_text, back_text, rank)
VALUES (1000, 100, 'Q', 'A', 1000);

SET LOCAL role = 'postgres';

SELECT is(
  (SELECT member_id FROM public.cards WHERE id = 1000),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'set_member_id trigger stamps auth.uid() on card insert'
);


-- ── set_deck_rank trigger ─────────────────────────────────────────────────────
--
-- Regression coverage for: deck creation sends no `rank` (unlike cards, a new
-- deck has no anchor to resolve — it always lands at the end), and decks.rank
-- is NOT NULL with no column default. Without this trigger every deck insert
-- fails with a not-null violation.

-- Test 3: first deck for a member with no rank supplied gets rank = 1000
-- (deck 100 was inserted in Setup above with no rank column at all).
SELECT is(
  (SELECT rank FROM public.decks WHERE id = 100),
  1000::numeric,
  'set_deck_rank trigger fills in rank 1000 for a member''s first deck'
);

-- Test 4: a second deck for the same member with no rank supplied appends
-- after the existing max, rather than colliding with it or staying null.
SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
INSERT INTO public.decks (id, title, is_public) VALUES (101, 'Alice Deck 2', false);

SELECT is(
  (SELECT rank FROM public.decks WHERE id = 101),
  2000::numeric,
  'set_deck_rank trigger appends the next deck after the current max rank'
);

-- Test 5: an explicit rank supplied by the caller (e.g. the reindex RPC path)
-- is left alone — the trigger only fills in a null.
SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
INSERT INTO public.decks (id, title, is_public, rank) VALUES (102, 'Alice Deck 3', false, 500);

SELECT is(
  (SELECT rank FROM public.decks WHERE id = 102),
  500::numeric,
  'set_deck_rank trigger does not override an explicitly supplied rank'
);


-- ── dedupe_media_slot_on_insert trigger ───────────────────────────────────────

-- Setup: insert two media rows for the same (card_id, slot) back-to-back
-- as the authenticated user (the set_member_id_on_media trigger needs
-- auth.uid() to stamp member_id). The first should be soft-deleted by the
-- dedupe trigger when the second row lands.
SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
SET LOCAL role = 'authenticated';

INSERT INTO public.media (card_id, slot, bucket, path)
VALUES (1000, 'card_front'::public.media_slot, 'member-images', 'first.png');

INSERT INTO public.media (card_id, slot, bucket, path)
VALUES (1000, 'card_front'::public.media_slot, 'member-images', 'second.png');

SET LOCAL role = 'postgres';

-- Test 6: Exactly one active row remains per (card_id, slot)
SELECT is(
  (SELECT count(*) FROM public.media
   WHERE card_id = 1000
     AND slot = 'card_front'::public.media_slot
     AND deleted_at IS NULL)::int,
  1,
  'exactly one active media row remains after second insert on same (card_id, slot)'
);

-- Test 7: Different slots are independent — inserting card_back doesn't
-- touch card_front.
SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
SET LOCAL role = 'authenticated';

INSERT INTO public.media (card_id, slot, bucket, path)
VALUES (1000, 'card_back'::public.media_slot, 'member-images', 'back.png');

SET LOCAL role = 'postgres';

SELECT is(
  (SELECT count(*) FROM public.media
   WHERE card_id = 1000 AND deleted_at IS NULL)::int,
  2,
  'card_front and card_back are independent — no cross-slot dedupe'
);

-- Test 8: If the trigger is bypassed, the unique partial index catches the
-- duplicate. Disable the trigger, then try to insert a second active row
-- for the same (card_id, slot) — expect a unique-violation error (SQLSTATE 23505).
ALTER TABLE public.media DISABLE TRIGGER trg_media_dedupe_slot;

SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
SET LOCAL role = 'authenticated';

SELECT throws_ok(
  $$
    INSERT INTO public.media (card_id, slot, bucket, path)
    VALUES (1000, 'card_front'::public.media_slot, 'member-images', 'bypass.png')
  $$,
  '23505',
  NULL,
  'unique partial index blocks a duplicate active row when the trigger is bypassed'
);

SET LOCAL role = 'postgres';
ALTER TABLE public.media ENABLE TRIGGER trg_media_dedupe_slot;


SELECT * FROM finish();
ROLLBACK;
