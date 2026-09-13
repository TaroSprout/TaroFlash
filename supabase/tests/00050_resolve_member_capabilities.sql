BEGIN;

SELECT plan(10);

INSERT INTO public.capabilities (key, state) VALUES ('test_resolve_targeted', 'targeted');
INSERT INTO public.capabilities (key, state) VALUES ('test_resolve_on', 'on');
INSERT INTO public.capabilities (key, state) VALUES ('test_resolve_off', 'off');

SELECT tests.create_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'res_gina_granted');
SELECT tests.create_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'res_nick_notgranted');
SELECT tests.create_user('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'res_amy_admin');

UPDATE public.members SET role = 'admin'
  WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

INSERT INTO public.capability_grants (key, member_id, granted_by)
VALUES ('test_resolve_targeted', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc');

SELECT tests.set_claims('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid);
SET LOCAL role = 'authenticated';

SELECT is(
  (SELECT live FROM public.resolve_member_capabilities() WHERE key = 'test_resolve_targeted'),
  true,
  'a granted member gets live=true for their targeted capability row'
);

SELECT is(
  (SELECT live FROM public.resolve_member_capabilities() WHERE key = 'test_resolve_on'),
  true,
  'state on resolves live=true for a granted member too'
);

SELECT is(
  (SELECT count(*)::int FROM public.resolve_member_capabilities()),
  (SELECT count(*)::int FROM public.capabilities),
  'resolve_member_capabilities() returns one row per capability, for a granted member'
);

SET LOCAL role = 'postgres';
SELECT tests.set_claims('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid);
SET LOCAL role = 'authenticated';

SELECT is(
  (SELECT live FROM public.resolve_member_capabilities() WHERE key = 'test_resolve_targeted'),
  false,
  'an ungranted member gets live=false for the same targeted capability'
);

SELECT is(
  (SELECT live FROM public.resolve_member_capabilities() WHERE key = 'test_resolve_on'),
  true,
  'state on resolves live=true for an ungranted member'
);

SELECT is(
  (SELECT live FROM public.resolve_member_capabilities() WHERE key = 'test_resolve_off'),
  false,
  'state off resolves live=false for an ungranted member'
);

SET LOCAL role = 'postgres';
SELECT tests.set_claims('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid);
SET LOCAL role = 'authenticated';

SELECT is(
  (SELECT live FROM public.resolve_member_capabilities() WHERE key = 'test_resolve_targeted'),
  false,
  'an admin who holds no grant gets live=false for the same targeted capability'
);

SELECT is(
  (SELECT live FROM public.resolve_member_capabilities() WHERE key = 'test_resolve_off'),
  false,
  'state off resolves live=false for an admin too'
);

SELECT is(
  (SELECT count(*)::int FROM public.resolve_member_capabilities()),
  (SELECT count(*)::int FROM public.capabilities),
  'resolve_member_capabilities() returns one row per capability, for the admin'
);

SELECT is(
  (SELECT count(DISTINCT key)::int FROM public.resolve_member_capabilities()
    WHERE key IN ('test_resolve_targeted', 'test_resolve_on', 'test_resolve_off')),
  3,
  'each test capability key appears exactly once in the resolved set'
);

SELECT * FROM finish();
ROLLBACK;
