-- =============================================================================
-- credit_occasion_reward — curve resolver + once-per-occasion payout
-- =============================================================================
-- Covers:
--   • the curve resolver's amount = round(max_bonus * (1 - decay^count))
--   • crediting the same (member, rule, occasion-ref) twice pays once
--   • a count whose resolved amount is 0 writes neither a grant nor a ledger row
--   • EXECUTE is service_role-only — anon/authenticated/PUBLIC are revoked
--   • member_rewards_grant_target_chk rejects both-set and neither-set rows
-- =============================================================================

BEGIN;

SELECT plan(15);

-- ── Setup ─────────────────────────────────────────────────────────────────────

SELECT tests.create_user('51515151-5151-5151-5151-515151515151'::uuid, 'occasion_rewards_member');

-- Fresh rule, isolated from the seeded 'study.session_completion_bonus' catalogue row.
INSERT INTO public.reward_rules (id, key, scope, resolver, params, is_active) VALUES
  (900051, 'test.occasion_bonus_00051', 'session', 'curve', '{"max_bonus":30,"decay":0.98}'::jsonb, true);

-- A milestone row purely to give the grant_target_chk test a valid FK target
-- for reward_milestone_id.
INSERT INTO public.reward_metrics (key) VALUES ('test.widgets_00051');
INSERT INTO public.reward_milestones (id, metric, threshold, rewards, name_key, is_active) VALUES
  (900052, 'test.widgets_00051', 50, '[{"kind":"paperclips","amount":10}]'::jsonb, 'test.milestone-00051', true);


-- ── Curve resolver formula ───────────────────────────────────────────────────

-- Test 1: crediting with count = 5 resolves round(30 * (1 - 0.98^5)) = 3.
SELECT lives_ok(
  $$ SELECT public.credit_occasion_reward('51515151-5151-5151-5151-515151515151'::uuid, 'test.occasion_bonus_00051', 'occasion-formula', 5) $$,
  'credit_occasion_reward credits a count-5 occasion without raising'
);

SELECT is(
  (SELECT pl.amount
     FROM public.paperclip_ledger pl
     JOIN public.member_rewards mm ON mm.id = pl.member_reward_id
    WHERE mm.member_id = '51515151-5151-5151-5151-515151515151'::uuid
      AND mm.reward_rule_id = 900051
      AND mm.occasion_ref = 'occasion-formula'),
  3::bigint,
  'the curve resolver pays round(30 * (1 - 0.98^5)) = 3'
);


-- ── Once-per-occasion idempotency ────────────────────────────────────────────

-- Test 3: crediting the same (member, rule, occasion-ref) a second time does not raise.
SELECT lives_ok(
  $$ SELECT public.credit_occasion_reward('51515151-5151-5151-5151-515151515151'::uuid, 'test.occasion_bonus_00051', 'occasion-formula', 5) $$,
  'crediting the same occasion a second time does not raise'
);

SELECT is(
  (SELECT count(*)::int FROM public.member_rewards
    WHERE member_id = '51515151-5151-5151-5151-515151515151'::uuid
      AND reward_rule_id = 900051
      AND occasion_ref = 'occasion-formula'),
  1,
  'exactly one member_rewards grant row exists for the occasion after two credits'
);

SELECT is(
  (SELECT count(*)::int
     FROM public.paperclip_ledger pl
     JOIN public.member_rewards mm ON mm.id = pl.member_reward_id
    WHERE mm.member_id = '51515151-5151-5151-5151-515151515151'::uuid
      AND mm.reward_rule_id = 900051
      AND mm.occasion_ref = 'occasion-formula'),
  1,
  'exactly one ledger row exists for the occasion after two credits'
);


-- ── Count 0 resolves to no payout ────────────────────────────────────────────

-- Test 6: count = 0 resolves an amount of 0, which returns before any insert.
SELECT lives_ok(
  $$ SELECT public.credit_occasion_reward('51515151-5151-5151-5151-515151515151'::uuid, 'test.occasion_bonus_00051', 'occasion-zero', 0) $$,
  'credit_occasion_reward with count 0 does not raise'
);

SELECT is_empty(
  $$
    SELECT 1 FROM public.member_rewards
     WHERE member_id = '51515151-5151-5151-5151-515151515151'::uuid
       AND reward_rule_id = 900051
       AND occasion_ref = 'occasion-zero'
  $$,
  'count 0 writes no member_rewards grant row'
);

SELECT is_empty(
  $$
    SELECT 1
      FROM public.paperclip_ledger pl
      JOIN public.member_rewards mm ON mm.id = pl.member_reward_id
     WHERE mm.member_id = '51515151-5151-5151-5151-515151515151'::uuid
       AND mm.reward_rule_id = 900051
       AND mm.occasion_ref = 'occasion-zero'
  $$,
  'count 0 writes no ledger row'
);


-- ── EXECUTE grants ────────────────────────────────────────────────────────────

SELECT is(
  has_function_privilege('service_role', 'public.credit_occasion_reward(uuid, text, text, bigint)', 'EXECUTE'),
  true,
  'service_role can execute credit_occasion_reward()'
);

SELECT is(
  has_function_privilege('anon', 'public.credit_occasion_reward(uuid, text, text, bigint)', 'EXECUTE'),
  false,
  'anon cannot execute credit_occasion_reward()'
);

SELECT is(
  has_function_privilege('authenticated', 'public.credit_occasion_reward(uuid, text, text, bigint)', 'EXECUTE'),
  false,
  'authenticated cannot execute credit_occasion_reward()'
);


-- ── member_rewards_grant_target_chk ──────────────────────────────────────────

-- Test 11: a row with BOTH reward_milestone_id and reward_rule_id set is rejected.
SELECT throws_ok(
  $$
    INSERT INTO public.member_rewards (member_id, reward_milestone_id, reward_rule_id)
    VALUES ('51515151-5151-5151-5151-515151515151'::uuid, 900052, 900051)
  $$,
  23514,
  NULL,
  'a member_rewards row with both a milestone and a rule set is rejected'
);

-- Test 12: a row with NEITHER set is rejected.
SELECT throws_ok(
  $$
    INSERT INTO public.member_rewards (member_id, reward_milestone_id, reward_rule_id)
    VALUES ('51515151-5151-5151-5151-515151515151'::uuid, NULL, NULL)
  $$,
  23514,
  NULL,
  'a member_rewards row with neither a milestone nor a rule set is rejected'
);

-- Test 13/14: a row with exactly one of the two targets set is accepted.
SELECT lives_ok(
  $$
    INSERT INTO public.member_rewards (member_id, reward_milestone_id, reward_rule_id)
    VALUES ('51515151-5151-5151-5151-515151515151'::uuid, 900052, NULL)
  $$,
  'a member_rewards row with only a milestone set is accepted'
);

SELECT lives_ok(
  $$
    INSERT INTO public.member_rewards (member_id, reward_milestone_id, reward_rule_id, occasion_ref)
    VALUES ('51515151-5151-5151-5151-515151515151'::uuid, NULL, 900051, 'occasion-accepted')
  $$,
  'a member_rewards row with only a rule set is accepted'
);

SELECT * FROM finish();
ROLLBACK;
