-- =============================================================================
-- credit_occasion_reward — per_card resolver + once-per-occasion payout
-- =============================================================================
-- Covers:
--   • the per_card resolver's base = round(base_param * 1000 * correct_count)
--   • the per_card resolver's bonus = floor(bonus_param * difficulty_factor) * 1000
--   • a bonus under one whole clip writes no session_bonus ledger row
--   • crediting the same (member, rule, occasion-ref) twice pays once
--   • counts whose resolved base and bonus are both 0 write neither a grant nor a ledger row
--   • EXECUTE is service_role-only — anon/authenticated/PUBLIC are revoked
--   • member_rewards_grant_target_chk rejects both-set and neither-set rows
-- =============================================================================

BEGIN;

SELECT plan(17);

-- ── Setup ─────────────────────────────────────────────────────────────────────

SELECT tests.create_user('51515151-5151-5151-5151-515151515151'::uuid, 'occasion_rewards_member');

-- Fresh rule, isolated from the seeded 'study.session_completion_bonus' catalogue row.
INSERT INTO public.reward_rules (id, key, scope, resolver, params, is_active) VALUES
  (900051, 'test.occasion_bonus_00051', 'session', 'per_card', '{"base":0.2,"bonus":0.2}'::jsonb, true);

-- A milestone row purely to give the grant_target_chk test a valid FK target
-- for reward_milestone_id.
INSERT INTO public.reward_metrics (key) VALUES ('test.widgets_00051');
INSERT INTO public.reward_milestones (id, metric, threshold, rewards, name_key, is_active) VALUES
  (900052, 'test.widgets_00051', 50, '[{"kind":"paperclips","amount":10}]'::jsonb, 'test.milestone-00051', true);


-- ── per_card resolver formula: base ──────────────────────────────────────────

-- Test 1: crediting 4 correct cards with a difficulty factor too small to
-- clear a whole bonus clip resolves base = round(0.2 * 1000 * 4) = 800, and
-- writes only the session_base row.
SELECT lives_ok(
  $$ SELECT public.credit_occasion_reward('51515151-5151-5151-5151-515151515151'::uuid, 'test.occasion_bonus_00051', 'occasion-base-only', 4, 0.1) $$,
  'credit_occasion_reward credits a base-only occasion without raising'
);

SELECT is(
  (SELECT pl.amount
     FROM public.paperclip_ledger pl
     JOIN public.member_rewards mm ON mm.id = pl.member_reward_id
    WHERE mm.member_id = '51515151-5151-5151-5151-515151515151'::uuid
      AND mm.reward_rule_id = 900051
      AND mm.occasion_ref = 'occasion-base-only'
      AND pl.source = 'session_base'),
  800::bigint,
  'the per_card resolver pays base = round(0.2 * 1000 * 4) = 800 thousandths'
);

SELECT is_empty(
  $$
    SELECT 1
      FROM public.paperclip_ledger pl
      JOIN public.member_rewards mm ON mm.id = pl.member_reward_id
     WHERE mm.member_id = '51515151-5151-5151-5151-515151515151'::uuid
       AND mm.reward_rule_id = 900051
       AND mm.occasion_ref = 'occasion-base-only'
       AND pl.source = 'session_bonus'
  $$,
  'a bonus under one whole clip writes no session_bonus ledger row'
);


-- ── per_card resolver formula: bonus ─────────────────────────────────────────

-- Test 4: a difficulty factor of 5.5 resolves bonus = floor(0.2 * 5.5) * 1000
-- = floor(1.1) * 1000 = 1000 thousandths (one whole clip).
SELECT lives_ok(
  $$ SELECT public.credit_occasion_reward('51515151-5151-5151-5151-515151515151'::uuid, 'test.occasion_bonus_00051', 'occasion-bonus', 4, 5.5) $$,
  'credit_occasion_reward credits a bonus-clearing occasion without raising'
);

SELECT is(
  (SELECT pl.amount
     FROM public.paperclip_ledger pl
     JOIN public.member_rewards mm ON mm.id = pl.member_reward_id
    WHERE mm.member_id = '51515151-5151-5151-5151-515151515151'::uuid
      AND mm.reward_rule_id = 900051
      AND mm.occasion_ref = 'occasion-bonus'
      AND pl.source = 'session_bonus'),
  1000::bigint,
  'the per_card resolver pays bonus = floor(0.2 * 5.5) * 1000 = 1000 thousandths'
);


-- ── Once-per-occasion idempotency ────────────────────────────────────────────

-- Test 6: crediting the same (member, rule, occasion-ref) a second time does not raise.
SELECT lives_ok(
  $$ SELECT public.credit_occasion_reward('51515151-5151-5151-5151-515151515151'::uuid, 'test.occasion_bonus_00051', 'occasion-base-only', 4, 0.1) $$,
  'crediting the same occasion a second time does not raise'
);

SELECT is(
  (SELECT count(*)::int FROM public.member_rewards
    WHERE member_id = '51515151-5151-5151-5151-515151515151'::uuid
      AND reward_rule_id = 900051
      AND occasion_ref = 'occasion-base-only'),
  1,
  'exactly one member_rewards grant row exists for the occasion after two credits'
);

SELECT is(
  (SELECT count(*)::int
     FROM public.paperclip_ledger pl
     JOIN public.member_rewards mm ON mm.id = pl.member_reward_id
    WHERE mm.member_id = '51515151-5151-5151-5151-515151515151'::uuid
      AND mm.reward_rule_id = 900051
      AND mm.occasion_ref = 'occasion-base-only'),
  1,
  'exactly one ledger row exists for the occasion after two credits'
);


-- ── Count 0 with no difficulty resolves to no payout ────────────────────────

-- Test 9: count = 0, difficulty factor 0 resolves base = 0 and bonus = 0, which
-- returns before any insert.
SELECT lives_ok(
  $$ SELECT public.credit_occasion_reward('51515151-5151-5151-5151-515151515151'::uuid, 'test.occasion_bonus_00051', 'occasion-zero', 0, 0) $$,
  'credit_occasion_reward with count 0 and difficulty 0 does not raise'
);

SELECT is_empty(
  $$
    SELECT 1 FROM public.member_rewards
     WHERE member_id = '51515151-5151-5151-5151-515151515151'::uuid
       AND reward_rule_id = 900051
       AND occasion_ref = 'occasion-zero'
  $$,
  'count 0 with no bonus writes no member_rewards grant row'
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
  'count 0 with no bonus writes no ledger row'
);


-- ── EXECUTE grants ────────────────────────────────────────────────────────────

SELECT is(
  has_function_privilege('service_role', 'public.credit_occasion_reward(uuid, text, text, bigint, numeric)', 'EXECUTE'),
  true,
  'service_role can execute credit_occasion_reward()'
);

SELECT is(
  has_function_privilege('anon', 'public.credit_occasion_reward(uuid, text, text, bigint, numeric)', 'EXECUTE'),
  false,
  'anon cannot execute credit_occasion_reward()'
);

SELECT is(
  has_function_privilege('authenticated', 'public.credit_occasion_reward(uuid, text, text, bigint, numeric)', 'EXECUTE'),
  false,
  'authenticated cannot execute credit_occasion_reward()'
);


-- ── member_rewards_grant_target_chk ──────────────────────────────────────────

-- Test 15: a row with BOTH reward_milestone_id and reward_rule_id set is rejected.
SELECT throws_ok(
  $$
    INSERT INTO public.member_rewards (member_id, reward_milestone_id, reward_rule_id)
    VALUES ('51515151-5151-5151-5151-515151515151'::uuid, 900052, 900051)
  $$,
  23514,
  NULL,
  'a member_rewards row with both a milestone and a rule set is rejected'
);

-- Test 16: a row with NEITHER set is rejected.
SELECT throws_ok(
  $$
    INSERT INTO public.member_rewards (member_id, reward_milestone_id, reward_rule_id)
    VALUES ('51515151-5151-5151-5151-515151515151'::uuid, NULL, NULL)
  $$,
  23514,
  NULL,
  'a member_rewards row with neither a milestone nor a rule set is rejected'
);

-- Test 17: a row with exactly one of the two targets set is accepted.
SELECT lives_ok(
  $$
    INSERT INTO public.member_rewards (member_id, reward_milestone_id, reward_rule_id)
    VALUES ('51515151-5151-5151-5151-515151515151'::uuid, 900052, NULL)
  $$,
  'a member_rewards row with only a milestone set is accepted'
);

SELECT * FROM finish();
ROLLBACK;
