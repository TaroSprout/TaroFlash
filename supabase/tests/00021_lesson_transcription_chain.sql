-- =============================================================================
-- Async transcription: durable phase chain + stall reaper
--
-- Covers the 20260606000003 + 20260606000004 migrations:
--   * create_pending_lesson seeds the state machine ('processing'/'transcribing')
--   * the chain trigger exists and its kick is non-fatal to the row write
--   * reap_stalled_lessons settles over-deadline processing rows to
--     failed/'stalled', and leaves fresh processing rows untouched
-- =============================================================================

BEGIN;

SELECT plan(7);

-- ── Setup ─────────────────────────────────────────────────────────────────────

SELECT tests.create_user('33333333-3333-3333-3333-333333333333'::uuid, 'carol_chain');
SELECT tests.set_claims('33333333-3333-3333-3333-333333333333'::uuid);
INSERT INTO public.lesson_collections (id, title) VALUES (30, 'Carol Book');


-- ── create_pending_lesson seeds the state machine (act as Carol) ────────────────
SET LOCAL role = 'authenticated';

-- Test 1: a new lesson is born 'processing'
SELECT is(
  (public.create_pending_lesson(30, 'Ch1', '33333333-3333-3333-3333-333333333333/c1.mp3')).status,
  'processing',
  'create_pending_lesson inserts the row as processing'
);

-- Test 2: ...pointing at the first phase, so the chain trigger fires step 1
SELECT is(
  (public.create_pending_lesson(30, 'Ch2', '33333333-3333-3333-3333-333333333333/c2.mp3')).phase,
  'transcribing',
  'create_pending_lesson seeds phase=transcribing'
);

-- Test 3: the kick is best-effort — even though the AFTER INSERT trigger ran (and
-- tried to fire the chain), the row itself committed. A raise in the kick would
-- have rolled this insert back and matched 0 rows.
SELECT is(
  (SELECT count(*) FROM public.lessons WHERE collection_id = 30)::int,
  2,
  'a failed/no-op chain kick never aborts the lesson insert'
);


-- ── Stall reaper (set up rows that bypass the chain trigger) ────────────────────
-- phase IS NULL trips the trigger's "phase is not null" guard, so these inserts
-- don't fire a kick — letting us test the reaper in isolation. updated_at is the
-- heartbeat the reaper reads.
INSERT INTO public.lessons (id, collection_id, title, audio_path, "position", status, phase, updated_at)
VALUES
  (300, 30, 'Stale', '33333333-3333-3333-3333-333333333333/s.mp3', 10, 'processing', NULL, now() - interval '11 minutes'),
  (301, 30, 'Fresh', '33333333-3333-3333-3333-333333333333/f.mp3', 11, 'processing', NULL, now());

SET LOCAL role = 'postgres';

-- Test 4: the sweep reports it settled exactly the one over-deadline row
SELECT is(
  public.reap_stalled_lessons(),
  1,
  'reap_stalled_lessons settles exactly the over-deadline row'
);

-- Test 5/6: the stale row is now terminal with a retry-able code
SELECT is(
  (SELECT status FROM public.lessons WHERE id = 300),
  'failed',
  'a stalled row is settled to failed'
);
SELECT is(
  (SELECT error_code FROM public.lessons WHERE id = 300),
  'stalled',
  'a stalled row carries error_code=stalled'
);

-- Test 7: a row still inside the deadline is left running
SELECT is(
  (SELECT status FROM public.lessons WHERE id = 301),
  'processing',
  'a fresh processing row is not reaped'
);


SELECT * FROM finish();
ROLLBACK;
