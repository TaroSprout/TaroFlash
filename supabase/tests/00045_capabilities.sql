-- =============================================================================
-- Capability switches introduced in 20260910172958_capabilities.sql
--
--   - capability_is_live(key) reads the switch row's state; a missing row
--     reads as not live, never a fallback (corpus/authz/capabilities.md).
--   - capability_is_live is SECURITY DEFINER but locked to `authenticated` —
--     it must never be anon-executable, feeding the 00043 definer-function
--     anon-grant guard.
--   - Any authenticated member can SELECT capabilities; only an admin
--     can INSERT/UPDATE. Moderator and ordinary member writes are refused at
--     the database.
-- =============================================================================

BEGIN;

SELECT plan(10);

-- ── capability_is_live() reads the switch row ─────────────────────────────────

INSERT INTO public.capabilities (key, state) VALUES ('test_switch_on', 'on');
INSERT INTO public.capabilities (key, state) VALUES ('test_switch_off', 'off');

-- Test 1: seeded 'on' switch reads live.
SELECT is(
  public.capability_is_live('test_switch_on'),
  true,
  'capability_is_live() returns true for a switch seeded on'
);

-- Test 2: seeded 'off' switch reads not live.
SELECT is(
  public.capability_is_live('test_switch_off'),
  false,
  'capability_is_live() returns false for a switch seeded off'
);

-- Test 3: no row at all reads not live (fails closed).
SELECT is(
  public.capability_is_live('test_switch_missing'),
  false,
  'capability_is_live() returns false when no switch row exists'
);

-- ── EXECUTE privilege lockdown ────────────────────────────────────────────────

-- Test 4: anon cannot execute capability_is_live() — feeds the 00043 guard.
SELECT is(
  has_function_privilege('anon', 'public.capability_is_live(text)', 'EXECUTE'),
  false,
  'anon cannot execute capability_is_live()'
);

-- Test 5: authenticated can execute capability_is_live().
SELECT is(
  has_function_privilege('authenticated', 'public.capability_is_live(text)', 'EXECUTE'),
  true,
  'authenticated can execute capability_is_live()'
);

-- ── RLS: read is open to any member, write is admin-only ──────────────────────

SELECT tests.create_user('11111111-1111-1111-1111-111111111111'::uuid, 'mallory');
SELECT tests.create_user('22222222-2222-2222-2222-222222222222'::uuid, 'mo_mod');
SELECT tests.create_user('33333333-3333-3333-3333-333333333333'::uuid, 'ada_admin');

UPDATE public.members SET role = 'moderator'
  WHERE id = '22222222-2222-2222-2222-222222222222';
UPDATE public.members SET role = 'admin'
  WHERE id = '33333333-3333-3333-3333-333333333333';

-- ── Act as Mallory (plain member) ─────────────────────────────────────────────
SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
SET LOCAL role = 'authenticated';

-- Test 6: any authenticated member can SELECT capabilities.
SELECT is(
  (SELECT count(*)::int FROM public.capabilities WHERE key = 'test_switch_on'),
  1,
  'an ordinary member can select capabilities'
);

-- Test 7: ordinary member cannot insert a capability switch.
SELECT throws_ok(
  $$
    INSERT INTO public.capabilities (key, state) VALUES ('test_switch_member', 'on')
  $$,
  NULL,
  NULL,
  'an ordinary member cannot insert a capability switch'
);

-- ── Act as Mo (moderator) ──────────────────────────────────────────────────────
SET LOCAL role = 'postgres';
SELECT tests.set_claims('22222222-2222-2222-2222-222222222222'::uuid);
SET LOCAL role = 'authenticated';

-- Test 8: moderator cannot insert a capability switch.
SELECT throws_ok(
  $$
    INSERT INTO public.capabilities (key, state) VALUES ('test_switch_mod', 'on')
  $$,
  NULL,
  NULL,
  'a moderator cannot insert a capability switch'
);

-- Test 9: moderator's update to an existing switch is silently dropped by RLS.
UPDATE public.capabilities SET state = 'on' WHERE key = 'test_switch_off';

SET LOCAL role = 'postgres';
SELECT is(
  (SELECT state::text FROM public.capabilities WHERE key = 'test_switch_off'),
  'off',
  'a moderator cannot update a capability switch'
);

-- ── Act as Ada (admin) ─────────────────────────────────────────────────────────
SELECT tests.set_claims('33333333-3333-3333-3333-333333333333'::uuid);
SET LOCAL role = 'authenticated';

-- Test 10: admin can insert and update a capability switch.
SELECT lives_ok(
  $$
    INSERT INTO public.capabilities (key, state) VALUES ('test_switch_admin', 'on')
  $$,
  'an admin can insert a capability switch'
);

SET LOCAL role = 'postgres';
SELECT tests.set_claims(NULL);

SELECT * FROM finish();
ROLLBACK;
