-- =============================================================================
-- purge_downgraded_decks(): the daily sweep.
--
-- Deletes only decks ranked beyond deck_limit for a free member whose
-- downgrade_delete_at is in the past. Mirrors deck_lock_deadline()'s own
-- rank math, so whatever reads as locked at sweep time is what gets deleted.
--
-- Covers [obligation]:
--   1. A member past their deadline loses every deck beyond deck_limit; the
--      top deck_limit survive.
--   2. A member still within the deadline loses nothing.
--   3. A member who resubscribed (deadline cleared) loses nothing.
--   4. A member who reordered a deck above the line before the sweep keeps it.
-- =============================================================================

BEGIN;

SELECT plan(10);

-- ── Setup (as postgres superuser) ─────────────────────────────────────────────

SELECT tests.create_user('e0000000-0000-0000-0000-00000000f001'::uuid, 'purge_gary');
SELECT tests.create_user('e0000000-0000-0000-0000-00000000f002'::uuid, 'purge_helen');
SELECT tests.create_user('e0000000-0000-0000-0000-00000000f003'::uuid, 'purge_ivan');
SELECT tests.create_user('e0000000-0000-0000-0000-00000000f004'::uuid, 'purge_julia');

-- Gary: 12 decks, deadline already past — the sweep should fire.
SELECT tests.set_claims('e0000000-0000-0000-0000-00000000f001'::uuid);
SET LOCAL role = 'authenticated';
INSERT INTO public.decks (id, title, is_public) VALUES
  (900, 'Gary 900', false), (901, 'Gary 901', false), (902, 'Gary 902', false),
  (903, 'Gary 903', false), (904, 'Gary 904', false), (905, 'Gary 905', false),
  (906, 'Gary 906', false), (907, 'Gary 907', false), (908, 'Gary 908', false),
  (909, 'Gary 909', false), (910, 'Gary 910', false), (911, 'Gary 911', false);
SET LOCAL role = 'postgres';
UPDATE public.members SET downgrade_delete_at = now() - interval '1 hour'
WHERE id = 'e0000000-0000-0000-0000-00000000f001';

-- Helen: 12 decks, deadline still 10 days out — the sweep should skip her.
SELECT tests.set_claims('e0000000-0000-0000-0000-00000000f002'::uuid);
SET LOCAL role = 'authenticated';
INSERT INTO public.decks (id, title, is_public) VALUES
  (920, 'Helen 920', false), (921, 'Helen 921', false), (922, 'Helen 922', false),
  (923, 'Helen 923', false), (924, 'Helen 924', false), (925, 'Helen 925', false),
  (926, 'Helen 926', false), (927, 'Helen 927', false), (928, 'Helen 928', false),
  (929, 'Helen 929', false), (930, 'Helen 930', false), (931, 'Helen 931', false);
SET LOCAL role = 'postgres';
UPDATE public.members SET downgrade_delete_at = now() + interval '10 days'
WHERE id = 'e0000000-0000-0000-0000-00000000f002';

-- Ivan: 12 decks, deadline was set then cleared (resubscribed).
SELECT tests.set_claims('e0000000-0000-0000-0000-00000000f003'::uuid);
SET LOCAL role = 'authenticated';
INSERT INTO public.decks (id, title, is_public) VALUES
  (940, 'Ivan 940', false), (941, 'Ivan 941', false), (942, 'Ivan 942', false),
  (943, 'Ivan 943', false), (944, 'Ivan 944', false), (945, 'Ivan 945', false),
  (946, 'Ivan 946', false), (947, 'Ivan 947', false), (948, 'Ivan 948', false),
  (949, 'Ivan 949', false), (950, 'Ivan 950', false), (951, 'Ivan 951', false);
SET LOCAL role = 'postgres';
UPDATE public.members SET downgrade_delete_at = now() - interval '1 hour'
WHERE id = 'e0000000-0000-0000-0000-00000000f003';
SELECT public.clear_downgrade_grace('e0000000-0000-0000-0000-00000000f003'::uuid);

-- Julia: 12 decks, deadline past, but she reorders her locked deck (951)
-- above the limit line before the sweep runs.
SELECT tests.set_claims('e0000000-0000-0000-0000-00000000f004'::uuid);
SET LOCAL role = 'authenticated';
INSERT INTO public.decks (id, title, is_public) VALUES
  (960, 'Julia 960', false), (961, 'Julia 961', false), (962, 'Julia 962', false),
  (963, 'Julia 963', false), (964, 'Julia 964', false), (965, 'Julia 965', false),
  (966, 'Julia 966', false), (967, 'Julia 967', false), (968, 'Julia 968', false),
  (969, 'Julia 969', false), (970, 'Julia 970', false), (971, 'Julia 971', false);
SET LOCAL role = 'postgres';
UPDATE public.members SET downgrade_delete_at = now() - interval '1 hour'
WHERE id = 'e0000000-0000-0000-0000-00000000f004';

SELECT tests.set_claims('e0000000-0000-0000-0000-00000000f004'::uuid);
SET LOCAL role = 'authenticated';
SELECT public.move_deck(971, 960, 'before');
SET LOCAL role = 'postgres';
SELECT tests.set_claims(NULL);


-- ── Run the sweep ──────────────────────────────────────────────────────────────

SELECT public.purge_downgraded_decks();


-- ── Gary: past deadline, over the limit — top deck_limit survive [obligation] ──

SELECT is(
  (SELECT count(*)::int FROM public.decks WHERE member_id = 'e0000000-0000-0000-0000-00000000f001'),
  10,
  'purge_downgraded_decks() leaves only the top deck_limit decks for a member past their deadline [obligation]'
);

SELECT ok(
  NOT EXISTS (SELECT 1 FROM public.decks WHERE id = 910),
  'purge_downgraded_decks() deletes a deck ranked beyond the limit [obligation]'
);

SELECT ok(
  NOT EXISTS (SELECT 1 FROM public.decks WHERE id = 911),
  'purge_downgraded_decks() deletes every deck ranked beyond the limit, not just the first [obligation]'
);

SELECT ok(
  EXISTS (SELECT 1 FROM public.decks WHERE id = 900),
  'purge_downgraded_decks() leaves a top-ranked deck untouched'
);


-- ── Helen: still within the deadline — loses nothing [obligation] ────────────

SELECT is(
  (SELECT count(*)::int FROM public.decks WHERE member_id = 'e0000000-0000-0000-0000-00000000f002'),
  12,
  'purge_downgraded_decks() touches nothing for a member still within their deadline [obligation]'
);


-- ── Ivan: resubscribed (deadline cleared) — loses nothing [obligation] ───────

SELECT is(
  (SELECT count(*)::int FROM public.decks WHERE member_id = 'e0000000-0000-0000-0000-00000000f003'),
  12,
  'purge_downgraded_decks() touches nothing for a member whose deadline was cleared [obligation]'
);


-- ── Julia: reordered a deck above the line — that deck survives [obligation] ──

SELECT ok(
  EXISTS (SELECT 1 FROM public.decks WHERE id = 971),
  'purge_downgraded_decks() spares a deck reordered above the limit line before the sweep [obligation]'
);

SELECT is(
  (SELECT count(*)::int FROM public.decks WHERE member_id = 'e0000000-0000-0000-0000-00000000f004'),
  10,
  'purge_downgraded_decks() still purges down to deck_limit for Julia, dynamically recomputed after her reorder'
);

SELECT ok(
  NOT EXISTS (SELECT 1 FROM public.decks WHERE id = 969),
  'purge_downgraded_decks() deletes the deck displaced past the line by Julia''s reorder'
);

SELECT ok(
  NOT EXISTS (SELECT 1 FROM public.decks WHERE id = 970),
  'purge_downgraded_decks() deletes every deck displaced past the line by Julia''s reorder'
);

SELECT * FROM finish();
ROLLBACK;
