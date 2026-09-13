BEGIN;

SELECT plan(19);

INSERT INTO public.capabilities (key, state) VALUES ('test_grant_targeted', 'targeted');
INSERT INTO public.capabilities (key, state) VALUES ('test_grant_on', 'on');
INSERT INTO public.capabilities (key, state) VALUES ('test_grant_off', 'off');

SELECT tests.create_user('55555555-5555-5555-5555-555555555555'::uuid, 'gina_granted');
SELECT tests.create_user('66666666-6666-6666-6666-666666666666'::uuid, 'nick_notgranted');
SELECT tests.create_user('77777777-7777-7777-7777-777777777777'::uuid, 'amy_admin');

UPDATE public.members SET role = 'admin'
  WHERE id = '77777777-7777-7777-7777-777777777777';

INSERT INTO public.capability_grants (key, member_id, granted_by)
VALUES ('test_grant_targeted', '55555555-5555-5555-5555-555555555555', '77777777-7777-7777-7777-777777777777');

SELECT tests.set_claims('55555555-5555-5555-5555-555555555555'::uuid);
SET LOCAL role = 'authenticated';

SELECT is(
  public.capability_is_live('test_grant_targeted'),
  true,
  'capability_is_live() returns true for a granted member on a targeted capability'
);

SET LOCAL role = 'postgres';
SELECT tests.set_claims('66666666-6666-6666-6666-666666666666'::uuid);
SET LOCAL role = 'authenticated';

SELECT is(
  public.capability_is_live('test_grant_targeted'),
  false,
  'capability_is_live() returns false for a non-granted member on the same targeted capability'
);

SET LOCAL role = 'postgres';
SELECT tests.set_claims('77777777-7777-7777-7777-777777777777'::uuid);
SET LOCAL role = 'authenticated';

INSERT INTO public.capabilities (key, state) VALUES ('test_grant_empty', 'targeted');

SELECT is(
  public.capability_is_live('test_grant_empty'),
  false,
  'capability_is_live() returns false for an admin when the allow-list is empty'
);

SELECT is(
  public.capability_is_live('test_grant_on'),
  true,
  'capability_is_live() still returns true for everyone on state on'
);

SELECT is(
  public.capability_is_live('test_grant_off'),
  false,
  'capability_is_live() still returns false for everyone on state off'
);

SELECT is(
  public.capability_is_live('test_grant_missing'),
  false,
  'capability_is_live() still returns false when no capability row exists'
);

SET LOCAL role = 'postgres';
SELECT tests.set_claims(NULL);

SELECT is(
  has_function_privilege('anon', 'public.capability_is_live(text)', 'EXECUTE'),
  false,
  'anon cannot execute capability_is_live()'
);

SELECT is(
  has_function_privilege('authenticated', 'public.capability_is_live(text)', 'EXECUTE'),
  true,
  'authenticated can execute capability_is_live()'
);

SELECT is(
  has_function_privilege('service_role', 'public.capability_is_live(text)', 'EXECUTE'),
  true,
  'service_role can execute capability_is_live()'
);

SELECT tests.set_claims('55555555-5555-5555-5555-555555555555'::uuid);
SET LOCAL role = 'authenticated';

SELECT is(
  (SELECT count(*)::int FROM public.capability_grants WHERE member_id = '55555555-5555-5555-5555-555555555555'),
  1,
  'a member can read their own capability grant row'
);

SELECT is(
  (SELECT count(*)::int FROM public.capability_grants WHERE member_id = '66666666-6666-6666-6666-666666666666'),
  0,
  'a member cannot see another member''s capability grant row'
);

SELECT throws_ok(
  $$
    INSERT INTO public.capability_grants (key, member_id)
    VALUES ('test_grant_targeted', '66666666-6666-6666-6666-666666666666')
  $$,
  NULL,
  NULL,
  'a non-admin cannot insert a capability grant'
);

SET LOCAL role = 'postgres';
SELECT tests.set_claims('66666666-6666-6666-6666-666666666666'::uuid);
SET LOCAL role = 'authenticated';

DELETE FROM public.capability_grants
WHERE key = 'test_grant_targeted' AND member_id = '55555555-5555-5555-5555-555555555555';

SET LOCAL role = 'postgres';
SELECT is(
  (SELECT count(*)::int FROM public.capability_grants
    WHERE key = 'test_grant_targeted' AND member_id = '55555555-5555-5555-5555-555555555555'),
  1,
  'a non-admin cannot delete another member''s capability grant'
);

SELECT tests.set_claims('77777777-7777-7777-7777-777777777777'::uuid);
SET LOCAL role = 'authenticated';

SELECT lives_ok(
  $$
    INSERT INTO public.capability_grants (key, member_id, granted_by)
    VALUES ('test_grant_targeted', '66666666-6666-6666-6666-666666666666', '77777777-7777-7777-7777-777777777777')
  $$,
  'an admin can insert a capability grant'
);

SELECT lives_ok(
  $$
    DELETE FROM public.capability_grants
    WHERE key = 'test_grant_targeted' AND member_id = '66666666-6666-6666-6666-666666666666'
  $$,
  'an admin can delete a capability grant'
);

SET LOCAL role = 'postgres';
SELECT tests.set_claims(NULL);

SELECT tests.create_user('88888888-8888-8888-8888-888888888888'::uuid, 'fk_member');
INSERT INTO public.capability_grants (key, member_id, granted_by)
VALUES ('test_grant_targeted', '88888888-8888-8888-8888-888888888888', '77777777-7777-7777-7777-777777777777');

DELETE FROM public.members WHERE id = '88888888-8888-8888-8888-888888888888';

SELECT is(
  (SELECT count(*)::int FROM public.capability_grants WHERE member_id = '88888888-8888-8888-8888-888888888888'),
  0,
  'deleting a granted member cascades away their capability_grants rows'
);

SELECT tests.create_user('99999999-9999-9999-9999-999999999999'::uuid, 'fk_admin');
UPDATE public.members SET role = 'admin' WHERE id = '99999999-9999-9999-9999-999999999999';

INSERT INTO public.capability_grants (key, member_id, granted_by)
VALUES ('test_grant_targeted', '55555555-5555-5555-5555-555555555555', '99999999-9999-9999-9999-999999999999')
ON CONFLICT (key, member_id) DO UPDATE SET granted_by = EXCLUDED.granted_by;

DELETE FROM public.members WHERE id = '99999999-9999-9999-9999-999999999999';

SELECT is(
  (SELECT count(*)::int FROM public.capability_grants
    WHERE key = 'test_grant_targeted' AND member_id = '55555555-5555-5555-5555-555555555555'),
  1,
  'deleting the granting admin keeps the grant row'
);

SELECT is(
  (SELECT granted_by FROM public.capability_grants
    WHERE key = 'test_grant_targeted' AND member_id = '55555555-5555-5555-5555-555555555555'),
  NULL::uuid,
  'deleting the granting admin nulls granted_by on the kept row'
);

DELETE FROM public.capabilities WHERE key = 'test_grant_key_cascade';
INSERT INTO public.capabilities (key, state) VALUES ('test_grant_key_cascade', 'targeted');
INSERT INTO public.capability_grants (key, member_id) VALUES ('test_grant_key_cascade', '55555555-5555-5555-5555-555555555555');

DELETE FROM public.capabilities WHERE key = 'test_grant_key_cascade';

SELECT is(
  (SELECT count(*)::int FROM public.capability_grants WHERE key = 'test_grant_key_cascade'),
  0,
  'deleting the capability key cascades its grants away'
);

SELECT * FROM finish();
ROLLBACK;
