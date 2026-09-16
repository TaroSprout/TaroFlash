-- =============================================================================
-- get_session_earnings — read-back of a session's completion-bonus payout
-- =============================================================================
-- Covers:
--   • earned equals the amount credited for that session id (joined through
--     member_rewards.occasion_ref = session_id::text)
--   • nothing credited for a session reads earned 0 / balance 0
--   • a repeat credit for the same session (once-per-occasion) leaves the
--     read unchanged
--   • RLS scopes the read to the caller — another member's session reads 0/0
-- =============================================================================

BEGIN;

SELECT plan(6);

-- ── Setup ─────────────────────────────────────────────────────────────────────

SELECT tests.create_user('54545454-5454-5454-5454-545454545401'::uuid, 'session_earnings_alice');
SELECT tests.create_user('54545454-5454-5454-5454-545454545402'::uuid, 'session_earnings_bob');

-- ── Nothing credited for the session ─────────────────────────────────────────

SELECT tests.set_claims('54545454-5454-5454-5454-545454545401'::uuid);
SET LOCAL role = 'authenticated';

-- Test 1/2: no ledger/member_rewards row for this session id at all.
SELECT is(
  (SELECT earned FROM public.get_session_earnings('a0000000-0000-0000-0000-000000000001'::uuid)),
  0::bigint,
  'earned is 0 when nothing was credited for the session'
);

SELECT is(
  (SELECT balance FROM public.get_session_earnings('a0000000-0000-0000-0000-000000000001'::uuid)),
  0::bigint,
  'balance is 0 when the member has no ledger rows'
);

-- ── Crediting the session, then reading it back ──────────────────────────────

SET LOCAL role = 'postgres';

-- credit_occasion_reward is SECURITY DEFINER, service_role-only — invoked as
-- postgres to mint the payout the read-back below asserts against.
SELECT public.credit_occasion_reward(
  '54545454-5454-5454-5454-545454545401'::uuid,
  'study.session_completion_bonus',
  'a0000000-0000-0000-0000-000000000002',
  5
);

SELECT tests.set_claims('54545454-5454-5454-5454-545454545401'::uuid);
SET LOCAL role = 'authenticated';

-- Test 3: earned matches what member_rewards/paperclip_ledger actually hold
-- for this session id, joined the same way the RPC does.
SELECT is(
  (SELECT earned FROM public.get_session_earnings('a0000000-0000-0000-0000-000000000002'::uuid)),
  (SELECT pl.amount
     FROM public.paperclip_ledger pl
     JOIN public.member_rewards mr ON mr.id = pl.member_reward_id
    WHERE mr.member_id = '54545454-5454-5454-5454-545454545401'::uuid
      AND mr.occasion_ref = 'a0000000-0000-0000-0000-000000000002'),
  'earned equals the amount credited for that session id'
);

-- ── Repeat credit for the same session is stable ─────────────────────────────

SET LOCAL role = 'postgres';

SELECT public.credit_occasion_reward(
  '54545454-5454-5454-5454-545454545401'::uuid,
  'study.session_completion_bonus',
  'a0000000-0000-0000-0000-000000000002',
  5
);

SELECT tests.set_claims('54545454-5454-5454-5454-545454545401'::uuid);
SET LOCAL role = 'authenticated';

-- Test 4: a repeat close/credit for the same session id reads the same earned.
SELECT is(
  (SELECT earned FROM public.get_session_earnings('a0000000-0000-0000-0000-000000000002'::uuid)),
  3::bigint,
  'a repeat credit for the same session leaves the read unchanged'
);

-- ── RLS scopes the read to the owning member ─────────────────────────────────

SELECT tests.set_claims('54545454-5454-5454-5454-545454545402'::uuid);
SET LOCAL role = 'authenticated';

-- Test 5/6: Bob reads Alice's session id and sees nothing of hers.
SELECT is(
  (SELECT earned FROM public.get_session_earnings('a0000000-0000-0000-0000-000000000002'::uuid)),
  0::bigint,
  'a different member reading the same session id sees earned 0'
);

SELECT is(
  (SELECT balance FROM public.get_session_earnings('a0000000-0000-0000-0000-000000000002'::uuid)),
  0::bigint,
  'a different member reading the same session id sees balance 0'
);

SELECT * FROM finish();
ROLLBACK;
