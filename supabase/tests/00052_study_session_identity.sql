-- =============================================================================
-- study_sessions + save_review(p_session_id) tests
--
-- save_review's 4th arg (p_session_id) mints/reuses a study_sessions row and
-- stamps it onto the review_logs row it writes:
--   * a session id is idempotent — ON CONFLICT (id) DO NOTHING means replaying
--     it (same or a different card) never grows a second study_sessions row
--     or touches the row's created_at/member_id
--   * omitting it (or passing NULL explicitly) writes no study_sessions row
--     and leaves review_logs.session_id NULL
--   * study_sessions is RLS-isolated like every other member-owned table
--   * review_logs.session_id -> study_sessions is ON DELETE SET NULL;
--     study_sessions.member_id -> members is ON DELETE CASCADE
-- =============================================================================

BEGIN;

SELECT plan(19);

-- ── Setup ─────────────────────────────────────────────────────────────────────

SELECT tests.create_user('11111111-1111-1111-1111-111111111111'::uuid, 'alice_sessions');
SELECT tests.create_user('22222222-2222-2222-2222-222222222222'::uuid, 'bob_sessions');

SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
SET LOCAL role = 'authenticated';

INSERT INTO public.decks (id, title, is_public) VALUES (100, 'Alice Deck', false);
INSERT INTO public.cards (id, deck_id, front_text, back_text, rank) VALUES
  (1000, 100, 'Q1', 'A1', 'a0'),
  (1001, 100, 'Q2', 'A2', 'b0'),
  (1002, 100, 'Q3', 'A3', 'c0'),
  (1003, 100, 'Q4', 'A4', 'd0');

-- ── save_review with a session id ────────────────────────────────────────────

-- Test 1: first save_review carrying a session id succeeds.
SELECT lives_ok(
  $$
    SELECT public.save_review(
      p_card_id := 1000,
      p_card := ROW(
        now() + interval '1 day', 2.5, 5.0,
        0::smallint, 1::smallint, 1::smallint, 0::smallint,
        now(), 0::smallint, 0::smallint
      )::public.review_card_state,
      p_log := ROW(
        3::smallint, 0::smallint, now(),
        0.0, 0.0, 0::smallint, now()
      )::public.review_log_entry,
      p_session_id := 'aaaaaaaa-0000-0000-0000-000000000001'::uuid
    )
  $$,
  'save_review with a session id succeeds'
);

SET LOCAL role = 'postgres';

-- Test 2: exactly one study_sessions row was minted for the caller.
SELECT is(
  (SELECT count(*) FROM public.study_sessions
   WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001')::int,
  1,
  'save_review inserts exactly one study_sessions row for the caller'
);

-- Test 3: it belongs to the calling member.
SELECT is(
  (SELECT member_id FROM public.study_sessions
   WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'the study_sessions row is owned by the caller'
);

-- Test 4: the resulting review_logs row carries the session id.
SELECT is(
  (SELECT count(*) FROM public.review_logs
   WHERE card_id = 1000 AND session_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int,
  1,
  'the review_logs row carries the session id'
);

-- Snapshot the session row so later reuse can be checked for drift.
CREATE TEMP TABLE _session_snapshot AS
SELECT created_at, member_id FROM public.study_sessions
WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001';

-- ── Reusing the same session id ──────────────────────────────────────────────

SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
SET LOCAL role = 'authenticated';

-- Test 5: replaying the same session id for the same card succeeds.
SELECT lives_ok(
  $$
    SELECT public.save_review(
      p_card_id := 1000,
      p_card := ROW(
        now() + interval '2 days', 2.6, 5.1,
        1::smallint, 2::smallint, 2::smallint, 0::smallint,
        now(), 1::smallint, 0::smallint
      )::public.review_card_state,
      p_log := ROW(
        4::smallint, 1::smallint, now() + interval '2 days',
        0.1, 0.1, 1::smallint, now() + interval '1 minute'
      )::public.review_log_entry,
      p_session_id := 'aaaaaaaa-0000-0000-0000-000000000001'::uuid
    )
  $$,
  'save_review reusing the same session id for the same card succeeds'
);

-- Test 6: reusing the same session id for a different card also succeeds.
SELECT lives_ok(
  $$
    SELECT public.save_review(
      p_card_id := 1001,
      p_card := ROW(
        now() + interval '1 day', 2.5, 5.0,
        0::smallint, 1::smallint, 1::smallint, 0::smallint,
        now(), 0::smallint, 0::smallint
      )::public.review_card_state,
      p_log := ROW(
        3::smallint, 0::smallint, now(),
        0.0, 0.0, 0::smallint, now() + interval '2 minutes'
      )::public.review_log_entry,
      p_session_id := 'aaaaaaaa-0000-0000-0000-000000000001'::uuid
    )
  $$,
  'save_review reusing the same session id for a different card succeeds'
);

SET LOCAL role = 'postgres';

-- Test 7: still exactly one study_sessions row for that id.
SELECT is(
  (SELECT count(*) FROM public.study_sessions
   WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001')::int,
  1,
  'reusing a session id adds no second study_sessions row'
);

-- Test 8: created_at is unchanged from the first insert.
SELECT is(
  (SELECT created_at FROM public.study_sessions
   WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  (SELECT created_at FROM _session_snapshot),
  'reusing a session id leaves created_at unchanged'
);

-- Test 9: member_id is unchanged.
SELECT is(
  (SELECT member_id FROM public.study_sessions
   WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  (SELECT member_id FROM _session_snapshot),
  'reusing a session id leaves member_id unchanged'
);

-- Test 10: all three logs (two cards) carry the same session id.
SELECT is(
  (SELECT count(*) FROM public.review_logs
   WHERE session_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int,
  3,
  'every log written under the reused session id carries it'
);

-- ── p_session_id omitted / explicit NULL ─────────────────────────────────────

SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
SET LOCAL role = 'authenticated';

-- Test 11: p_session_id omitted entirely.
SELECT lives_ok(
  $$
    SELECT public.save_review(
      p_card_id := 1002,
      p_card := ROW(
        now() + interval '1 day', 2.5, 5.0,
        0::smallint, 1::smallint, 1::smallint, 0::smallint,
        now(), 0::smallint, 0::smallint
      )::public.review_card_state,
      p_log := ROW(
        3::smallint, 0::smallint, now(),
        0.0, 0.0, 0::smallint, now() + interval '3 minutes'
      )::public.review_log_entry
    )
  $$,
  'save_review with p_session_id omitted succeeds'
);

-- Test 12: p_session_id explicit NULL.
SELECT lives_ok(
  $$
    SELECT public.save_review(
      p_card_id := 1003,
      p_card := ROW(
        now() + interval '1 day', 2.5, 5.0,
        0::smallint, 1::smallint, 1::smallint, 0::smallint,
        now(), 0::smallint, 0::smallint
      )::public.review_card_state,
      p_log := ROW(
        3::smallint, 0::smallint, now(),
        0.0, 0.0, 0::smallint, now() + interval '4 minutes'
      )::public.review_log_entry,
      p_session_id := NULL
    )
  $$,
  'save_review with p_session_id => NULL succeeds'
);

SET LOCAL role = 'postgres';

-- Test 13: no new study_sessions row was written by either call.
SELECT is(
  (SELECT count(*) FROM public.study_sessions)::int,
  1,
  'omitted/NULL session ids write no study_sessions row'
);

-- Test 14: both logs have a NULL session_id.
SELECT is(
  (SELECT count(*) FROM public.review_logs
   WHERE card_id IN (1002, 1003) AND session_id IS NULL)::int,
  2,
  'logs saved without a session id have session_id NULL'
);

-- ── RLS ───────────────────────────────────────────────────────────────────────

-- Test 15: Alice can read her own study_sessions row.
SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
SET LOCAL role = 'authenticated';

SELECT is(
  (SELECT count(*) FROM public.study_sessions
   WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001')::int,
  1,
  'Alice can read her own study_sessions row'
);

-- Test 16: Bob cannot read Alice's study_sessions row.
SELECT tests.set_claims('22222222-2222-2222-2222-222222222222'::uuid);
SET LOCAL role = 'authenticated';

SELECT is(
  (SELECT count(*) FROM public.study_sessions
   WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001')::int,
  0,
  'Bob cannot read Alice''s study_sessions row'
);

-- ── FK: ON DELETE SET NULL ───────────────────────────────────────────────────

SET LOCAL role = 'postgres';

DELETE FROM public.study_sessions WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001';

-- Test 17: the review_logs rows survive the session delete (SET NULL, not CASCADE).
SELECT is(
  (SELECT count(*) FROM public.review_logs
   WHERE card_id IN (1000, 1001) AND member_id = '11111111-1111-1111-1111-111111111111')::int,
  3,
  'the review_logs rows survive the session delete'
);

-- Test 18: dependent review_logs rows have their session_id nulled.
SELECT is(
  (SELECT count(*) FROM public.review_logs
   WHERE card_id IN (1000, 1001) AND session_id IS NULL)::int,
  3,
  'deleting a study_sessions row nulls dependent review_logs.session_id'
);

-- ── FK: ON DELETE CASCADE from members ───────────────────────────────────────

SELECT tests.create_user('33333333-3333-3333-3333-333333333333'::uuid, 'carol_sessions');
INSERT INTO public.study_sessions (id, member_id)
VALUES ('cccccccc-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333');

-- Empty search_path mimics supabase_auth_admin running the cascade (see
-- 00017_member_auth_cascade.sql).
SET LOCAL search_path = '';
DELETE FROM auth.users WHERE id = '33333333-3333-3333-3333-333333333333';
RESET search_path;

-- Test 19: the member's study_sessions row is cascade-deleted with them.
SELECT is(
  (SELECT count(*) FROM public.study_sessions
   WHERE id = 'cccccccc-0000-0000-0000-000000000001')::int,
  0,
  'deleting a member cascades their study_sessions rows'
);

SELECT * FROM finish();
ROLLBACK;
