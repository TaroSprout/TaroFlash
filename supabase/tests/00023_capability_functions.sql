-- =============================================================================
-- Capability functions introduced in 20260715000000_capability-functions.sql
--
--   - can_manage_members() / can_read_lesson_audio() are locked to
--     `authenticated` only — Postgres grants EXECUTE to anon + PUBLIC on new
--     functions by default, so the migration must explicitly revoke both
--     before granting to authenticated. Regression guard for that bug.
--   - can_manage_members() backs the members admin-update RLS policy; behavior
--     must be identical to the old inline `auth_role() = 'admin'` check.
-- =============================================================================

BEGIN;

SELECT plan(6);

-- ── EXECUTE privilege lockdown ────────────────────────────────────────────────

-- Test 1-2: anon cannot execute either capability function.
SELECT is(
  has_function_privilege('anon', 'public.can_manage_members()', 'EXECUTE'),
  false,
  'anon cannot execute can_manage_members()'
);

SELECT is(
  has_function_privilege('anon', 'public.can_read_lesson_audio()', 'EXECUTE'),
  false,
  'anon cannot execute can_read_lesson_audio()'
);

-- Test 3-4: authenticated can execute both.
SELECT is(
  has_function_privilege('authenticated', 'public.can_manage_members()', 'EXECUTE'),
  true,
  'authenticated can execute can_manage_members()'
);

SELECT is(
  has_function_privilege('authenticated', 'public.can_read_lesson_audio()', 'EXECUTE'),
  true,
  'authenticated can execute can_read_lesson_audio()'
);

-- ── can_manage_members() drives the members admin-update policy ───────────────

SELECT tests.create_user('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid, 'erin');
SELECT tests.create_user('ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid, 'frank_admin');

UPDATE public.members SET role = 'admin'
  WHERE id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

-- Test 5: non-admin cannot update another member's row.
SELECT tests.set_claims('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid);
SET LOCAL role = 'authenticated';

UPDATE public.members
SET description = 'hacked'
WHERE id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

SET LOCAL role = 'postgres';
SELECT tests.set_claims(NULL);
SELECT isnt(
  (SELECT description FROM public.members WHERE id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'),
  'hacked',
  'non-admin cannot update another member''s row via can_manage_members()'
);

-- Test 6: admin can update another member's row.
SELECT tests.set_claims('ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid);
SET LOCAL role = 'authenticated';

SELECT lives_ok(
  $$
    UPDATE public.members
    SET description = 'moderated by admin'
    WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
  $$,
  'admin can update another member''s row via can_manage_members()'
);

SET LOCAL role = 'postgres';
SELECT tests.set_claims(NULL);

SELECT * FROM finish();
ROLLBACK;
