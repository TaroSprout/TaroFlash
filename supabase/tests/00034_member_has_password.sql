-- =============================================================================
-- member_has_password(): whether the caller's account can sign in with a
-- password, introduced in 20260801005148_member_has_password.sql
--
--   - true when auth.users.encrypted_password is a non-empty value
--   - false when it is NULL
--   - false when it is the empty string
--   - anon is refused execute (grants are hand-written, db diff emits none)
-- =============================================================================

BEGIN;

SELECT plan(4);

-- ── Setup (as postgres superuser) ─────────────────────────────────────────────
SELECT tests.create_user('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid, 'has_pw');
SELECT tests.create_user('ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid, 'null_pw');
SELECT tests.create_user('11111111-1111-1111-1111-111111111111'::uuid, 'empty_pw');

UPDATE auth.users SET encrypted_password = NULL
  WHERE id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
UPDATE auth.users SET encrypted_password = ''
  WHERE id = '11111111-1111-1111-1111-111111111111';

-- ── Act as has_pw (real password set by tests.create_user) ────────────────────
SELECT tests.set_claims('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid);
SET LOCAL role = 'authenticated';

-- Test 1: true when encrypted_password is set
SELECT is(
  public.member_has_password(),
  true,
  'member_has_password() is true when encrypted_password is set'
);

SET LOCAL role = 'postgres';

-- ── Act as null_pw ─────────────────────────────────────────────────────────────
SELECT tests.set_claims('ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid);
SET LOCAL role = 'authenticated';

-- Test 2: false when encrypted_password is NULL
SELECT is(
  public.member_has_password(),
  false,
  'member_has_password() is false when encrypted_password is NULL'
);

SET LOCAL role = 'postgres';

-- ── Act as empty_pw ────────────────────────────────────────────────────────────
SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
SET LOCAL role = 'authenticated';

-- Test 3: false when encrypted_password is the empty string
SELECT is(
  public.member_has_password(),
  false,
  'member_has_password() is false when encrypted_password is empty string'
);

SET LOCAL role = 'postgres';
SELECT tests.set_claims(NULL);

-- ── Act as anon ────────────────────────────────────────────────────────────────
SET LOCAL role = 'anon';

-- Test 4: anon is refused execute entirely (hand-written grants)
SELECT throws_ok(
  $$ SELECT public.member_has_password() $$,
  '42501',
  NULL,
  'anon cannot execute member_has_password()'
);

SET LOCAL role = 'postgres';

SELECT * FROM finish();
ROLLBACK;
