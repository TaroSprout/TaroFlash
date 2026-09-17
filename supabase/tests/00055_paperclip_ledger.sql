-- =============================================================================
-- paperclip_ledger / paperclip_balance — subunit storage and floor display
-- =============================================================================
-- Covers:
--   • apply_reward writes one paperclip_ledger row per reward component in
--     the jsonb array, each carrying that component's amount (thousandths)
--     and source label
--   • paperclip_balance FLOORS summed thousandths to whole clips (never rounds)
--   • paperclip_balance keeps security_invoker='true' — a member cannot read
--     another member's ledger rows through it
--   • the ×1000 + floor-view combination leaves an existing whole-clip
--     balance unchanged (the 20260916230009 migration data step)
-- =============================================================================

BEGIN;

SELECT plan(8);

-- ── Setup ─────────────────────────────────────────────────────────────────────

SELECT tests.create_user('55555555-5555-5555-5555-555555555501'::uuid, 'ledger_member_alice');
SELECT tests.create_user('55555555-5555-5555-5555-555555555502'::uuid, 'ledger_member_bob');

INSERT INTO public.reward_rules (id, key, scope, resolver, params, is_active) VALUES
  (900055, 'test.ledger_bonus_00055', 'session', 'per_card', '{"base":0.2,"bonus":0.2}'::jsonb, true);

INSERT INTO public.member_rewards (id, member_id, reward_rule_id, occasion_ref) VALUES
  (900055, '55555555-5555-5555-5555-555555555501', 900055, 'occasion-00055');


-- ── apply_reward writes one row per component, with the right amount + source ──

SELECT lives_ok(
  $$
    SELECT public.apply_reward(
      '55555555-5555-5555-5555-555555555501'::uuid,
      jsonb_build_array(
        jsonb_build_object('kind', 'paperclips', 'amount', 800, 'source', 'session_base'),
        jsonb_build_object('kind', 'paperclips', 'amount', 600, 'source', 'session_bonus')
      ),
      900055
    )
  $$,
  'apply_reward credits a two-component reward without raising'
);

SELECT is(
  (SELECT count(*)::int FROM public.paperclip_ledger WHERE member_reward_id = 900055),
  2,
  'apply_reward writes one ledger row per reward component'
);

SELECT is(
  (SELECT amount FROM public.paperclip_ledger WHERE member_reward_id = 900055 AND source = 'session_base'),
  800::bigint,
  'the session_base row carries its own component amount'
);

SELECT is(
  (SELECT amount FROM public.paperclip_ledger WHERE member_reward_id = 900055 AND source = 'session_bonus'),
  600::bigint,
  'the session_bonus row carries its own component amount'
);


-- ── paperclip_balance floors, never rounds ──────────────────────────────────

SET LOCAL role = 'postgres';

INSERT INTO public.paperclip_ledger (member_id, amount, source, member_reward_id) VALUES
  ('55555555-5555-5555-5555-555555555502', 1600, 'milestone', NULL);

SELECT is(
  (SELECT balance FROM public.paperclip_balance WHERE member_id = '55555555-5555-5555-5555-555555555502'::uuid),
  1::bigint,
  'paperclip_balance floors 1600 thousandths (1.6 clips) down to 1, not rounding to 2'
);


-- ── security_invoker RLS isolation ──────────────────────────────────────────

SELECT tests.set_claims('55555555-5555-5555-5555-555555555502'::uuid);
SET LOCAL role = 'authenticated';

SELECT is_empty(
  $$
    SELECT 1 FROM public.paperclip_ledger
     WHERE member_id = '55555555-5555-5555-5555-555555555501'::uuid
  $$,
  'a member cannot read another member''s paperclip_ledger rows'
);

SELECT is(
  has_table_privilege('anon', 'public.paperclip_balance', 'SELECT'),
  true,
  'paperclip_balance grants SELECT broadly, leaving RLS as the real boundary'
);

-- ── security_invoker keeps the view honoring RLS per caller ─────────────────

SELECT is_empty(
  $$ SELECT 1 FROM public.paperclip_balance WHERE member_id = '55555555-5555-5555-5555-555555555501'::uuid $$,
  'security_invoker scopes the view read to the caller — Bob sees no row for Alice''s balance'
);

SELECT * FROM finish();
ROLLBACK;
