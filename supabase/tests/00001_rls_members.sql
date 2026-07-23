-- =============================================================================
-- RLS tests: members table
--
--   SELECT: locked down to own-row only (20260723152007_lockdown_members_select_rls)
--     - authenticated: only your own row, never another member's row
--       (email / stripe ids / preferences are sensitive columns on this table)
--     - anon: zero rows — anon was dropped from the SELECT policy entirely
--     - cross-member reads for public-facing UI (feedback author, public-deck
--       author) go through the narrow member_public_profile() definer helper
--       instead, which projects only display_name/description/cover_config
--   INSERT: you can only insert a row where id = your auth.uid()
--   UPDATE: you can only update your own row
-- =============================================================================

BEGIN;

SELECT plan(10);

-- ── Setup (as postgres superuser) ─────────────────────────────────────────────

SELECT tests.create_user('11111111-1111-1111-1111-111111111111'::uuid, 'alice');
SELECT tests.create_user('22222222-2222-2222-2222-222222222222'::uuid, 'bob');


-- ── Act as Alice ──────────────────────────────────────────────────────────────
SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
SET LOCAL role = 'authenticated';

-- Test 1: Alice sees only her own row, not Bob's.
SELECT results_eq(
  $$ SELECT id FROM public.members $$,
  $$ VALUES ('11111111-1111-1111-1111-111111111111'::uuid) $$,
  'Alice can only read her own member row (Bob''s row is not returned) [obligation]'
);

-- Test 1b: anon gets zero rows from a direct members SELECT.
SET LOCAL role = 'postgres';
SELECT tests.set_claims(NULL);
SET LOCAL role = 'anon';

SELECT is(
  (SELECT count(*)::int FROM public.members),
  0,
  'anon reading members directly gets zero rows [obligation]'
);

SET LOCAL role = 'postgres';
SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
SET LOCAL role = 'authenticated';

-- Test 2: Alice can update her own profile
SELECT lives_ok(
  $$
    UPDATE public.members
    SET description = 'Hello from Alice'
    WHERE id = '11111111-1111-1111-1111-111111111111'
  $$,
  'Alice can update her own profile'
);

-- Test 3: Alice cannot update Bob's profile (0 rows affected, no error)
UPDATE public.members
SET description = 'Hacked by Alice'
WHERE id = '22222222-2222-2222-2222-222222222222';

-- Verify as superuser
SET LOCAL role = 'postgres';
SELECT is(
  (SELECT description FROM public.members WHERE id = '22222222-2222-2222-2222-222222222222'),
  NULL,
  'Alice cannot update Bob''s profile (description unchanged)'
);

-- Test 4: Alice cannot insert a member row with a foreign UUID
SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
SET LOCAL role = 'authenticated';

SELECT throws_ok(
  $$
    INSERT INTO public.members (id, display_name)
    VALUES ('33333333-3333-3333-3333-333333333333', 'impersonator')
  $$,
  NULL,
  NULL,
  'Alice cannot insert a member row with a foreign UUID'
);


-- ── Act as Bob ────────────────────────────────────────────────────────────────
SET LOCAL role = 'postgres';
SELECT tests.set_claims('22222222-2222-2222-2222-222222222222'::uuid);
SET LOCAL role = 'authenticated';

-- Test 5: Bob can update his own profile
SELECT lives_ok(
  $$
    UPDATE public.members
    SET description = 'Hello from Bob'
    WHERE id = '22222222-2222-2222-2222-222222222222'
  $$,
  'Bob can update his own profile'
);

-- Test 6: Bob cannot update Alice's profile
UPDATE public.members
SET description = 'Hacked by Bob'
WHERE id = '11111111-1111-1111-1111-111111111111';

SET LOCAL role = 'postgres';
SELECT isnt(
  (SELECT description FROM public.members WHERE id = '11111111-1111-1111-1111-111111111111'),
  'Hacked by Bob',
  'Bob cannot update Alice''s profile'
);


-- ── member_public_profile(): the sanctioned cross-member read ────────────────

SET LOCAL role = 'postgres';
SELECT tests.set_claims(NULL);
UPDATE public.members
SET description = 'Bob''s public bio',
    cover_config = '{"theme": "blue-500"}'::jsonb
WHERE id = '22222222-2222-2222-2222-222222222222';

-- Test 7: return shape is exactly display_name, description, cover_config —
-- never email/stripe/preferences/role/plan.
SELECT bag_eq(
  $$ SELECT attname
     FROM pg_attribute
     WHERE attrelid = 'public.member_profile'::regclass
       AND attnum > 0
       AND NOT attisdropped $$,
  $$ VALUES ('display_name'), ('description'), ('cover_config') $$,
  'member_profile type exposes only display_name/description/cover_config [obligation]'
);

-- Test 8: authenticated caller (Alice) gets Bob's public profile via the helper.
SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
SET LOCAL role = 'authenticated';

SELECT results_eq(
  $$ SELECT display_name, description, cover_config
     FROM public.member_public_profile('22222222-2222-2222-2222-222222222222'::uuid) $$,
  $$ VALUES ('bob'::text, 'Bob''s public bio'::text, '{"theme": "blue-500"}'::jsonb) $$,
  'authenticated member_public_profile(other_id) returns the other member''s display_name/description/cover_config [obligation]'
);

-- Test 9: anon can also call member_public_profile — public-deck author names
-- must still render for logged-out visitors.
SET LOCAL role = 'postgres';
SELECT tests.set_claims(NULL);
SET LOCAL role = 'anon';

SELECT results_eq(
  $$ SELECT display_name, description, cover_config
     FROM public.member_public_profile('22222222-2222-2222-2222-222222222222'::uuid) $$,
  $$ VALUES ('bob'::text, 'Bob''s public bio'::text, '{"theme": "blue-500"}'::jsonb) $$,
  'anon member_public_profile(other_id) returns the other member''s profile [obligation]'
);

SET LOCAL role = 'postgres';
SELECT tests.set_claims(NULL);


SELECT * FROM finish();
ROLLBACK;
