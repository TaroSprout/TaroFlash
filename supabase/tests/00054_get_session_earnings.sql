-- =============================================================================
-- get_session_earnings — read-back of a session's base/bonus/balance payout
-- =============================================================================
-- Covers:
--   • base/bonus/balance are all 0 when nothing was credited for the session
--   • base equals the cross-session cumulative-floor delta the session
--     produced, matching close_study_session's own read
--   • bonus equals floor(this session's bonus thousandths / 1000)
--   • a repeat credit for the same session (once-per-occasion) leaves the
--     read unchanged
--   • RLS scopes the read to the caller — another member's session reads 0/0/0
-- =============================================================================

BEGIN;

SELECT plan(7);

-- ── Setup ─────────────────────────────────────────────────────────────────────

SELECT tests.create_user('54545454-5454-5454-5454-545454545401'::uuid, 'session_earnings_alice');
SELECT tests.create_user('54545454-5454-5454-5454-545454545402'::uuid, 'session_earnings_bob');

-- ── Nothing credited for the session ─────────────────────────────────────────

SELECT tests.set_claims('54545454-5454-5454-5454-545454545401'::uuid);
SET LOCAL role = 'authenticated';

-- Test 1: base/bonus/balance are all 0 with no ledger/member_rewards rows at all.
SELECT results_eq(
  $$ SELECT base, bonus, balance FROM public.get_session_earnings('a0000000-0000-0000-0000-000000000001'::uuid) $$,
  $$ VALUES (0::bigint, 0::bigint, 0::bigint) $$,
  'base, bonus, and balance are all 0 when nothing was credited for the session'
);

-- ── Crediting the session, then reading it back ──────────────────────────────

SET LOCAL role = 'postgres';

-- credit_occasion_reward is SECURITY DEFINER, service_role-only — invoked as
-- postgres to mint the payout the read-back below asserts against. 5 correct
-- cards, difficulty factor 5.5 clears a whole bonus clip in this one session:
-- base = round(0.2*1000*5) = 1000; bonus = floor(0.2*5.5)*1000 = 1000.
SELECT public.credit_occasion_reward(
  '54545454-5454-5454-5454-545454545401'::uuid,
  'study.session_completion_bonus',
  'a0000000-0000-0000-0000-000000000002',
  5,
  5.5
);

SELECT tests.set_claims('54545454-5454-5454-5454-545454545401'::uuid);
SET LOCAL role = 'authenticated';

-- Test 2: base reads 1 whole clip (a fresh member's cumulative base crosses
-- from 0 to 1000 in this one session) and bonus reads 1 whole clip.
SELECT results_eq(
  $$ SELECT base, bonus FROM public.get_session_earnings('a0000000-0000-0000-0000-000000000002'::uuid) $$,
  $$ VALUES (1::bigint, 1::bigint) $$,
  'base and bonus each read the one whole clip this session produced'
);

-- Test 3: balance reflects the whole-clip jump base + bonus caused.
SELECT is(
  (SELECT balance FROM public.get_session_earnings('a0000000-0000-0000-0000-000000000002'::uuid)),
  2::bigint,
  'balance equals the member''s new balance after crediting'
);

-- ── Repeat credit for the same session is stable ─────────────────────────────

SET LOCAL role = 'postgres';

SELECT public.credit_occasion_reward(
  '54545454-5454-5454-5454-545454545401'::uuid,
  'study.session_completion_bonus',
  'a0000000-0000-0000-0000-000000000002',
  5,
  5.5
);

SELECT tests.set_claims('54545454-5454-5454-5454-545454545401'::uuid);
SET LOCAL role = 'authenticated';

-- Test 4: a repeat close/credit for the same session id reads the same base/bonus.
SELECT results_eq(
  $$ SELECT base, bonus FROM public.get_session_earnings('a0000000-0000-0000-0000-000000000002'::uuid) $$,
  $$ VALUES (1::bigint, 1::bigint) $$,
  'a repeat credit for the same session leaves the read unchanged'
);

-- ── RLS scopes the read to the owning member ─────────────────────────────────

SELECT tests.set_claims('54545454-5454-5454-5454-545454545402'::uuid);
SET LOCAL role = 'authenticated';

-- Test 5/6/7: Bob reads Alice's session id and sees nothing of hers.
SELECT is(
  (SELECT base FROM public.get_session_earnings('a0000000-0000-0000-0000-000000000002'::uuid)),
  0::bigint,
  'a different member reading the same session id sees base 0'
);

SELECT is(
  (SELECT bonus FROM public.get_session_earnings('a0000000-0000-0000-0000-000000000002'::uuid)),
  0::bigint,
  'a different member reading the same session id sees bonus 0'
);

SELECT is(
  (SELECT balance FROM public.get_session_earnings('a0000000-0000-0000-0000-000000000002'::uuid)),
  0::bigint,
  'a different member reading the same session id sees balance 0'
);

SELECT * FROM finish();
ROLLBACK;
