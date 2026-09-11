BEGIN;

SELECT plan(10);

INSERT INTO public.capabilities (key, state) VALUES ('test_capability_on', 'on');
INSERT INTO public.capabilities (key, state) VALUES ('test_capability_off', 'off');

SELECT is(
  public.capability_is_live('test_capability_on'),
  true,
  'capability_is_live() returns true for a capability seeded on'
);

SELECT is(
  public.capability_is_live('test_capability_off'),
  false,
  'capability_is_live() returns false for a capability seeded off'
);

SELECT is(
  public.capability_is_live('test_capability_missing'),
  false,
  'capability_is_live() returns false when no capability row exists'
);

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

SELECT tests.create_user('11111111-1111-1111-1111-111111111111'::uuid, 'mallory');
SELECT tests.create_user('22222222-2222-2222-2222-222222222222'::uuid, 'mo_mod');
SELECT tests.create_user('33333333-3333-3333-3333-333333333333'::uuid, 'ada_admin');

UPDATE public.members SET role = 'moderator'
  WHERE id = '22222222-2222-2222-2222-222222222222';
UPDATE public.members SET role = 'admin'
  WHERE id = '33333333-3333-3333-3333-333333333333';

SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
SET LOCAL role = 'authenticated';

SELECT is(
  (SELECT count(*)::int FROM public.capabilities WHERE key = 'test_capability_on'),
  1,
  'an ordinary member can select capabilities'
);

SELECT throws_ok(
  $$
    INSERT INTO public.capabilities (key, state) VALUES ('test_capability_member', 'on')
  $$,
  NULL,
  NULL,
  'an ordinary member cannot insert a capability'
);

SET LOCAL role = 'postgres';
SELECT tests.set_claims('22222222-2222-2222-2222-222222222222'::uuid);
SET LOCAL role = 'authenticated';

SELECT throws_ok(
  $$
    INSERT INTO public.capabilities (key, state) VALUES ('test_capability_mod', 'on')
  $$,
  NULL,
  NULL,
  'a moderator cannot insert a capability'
);

UPDATE public.capabilities SET state = 'on' WHERE key = 'test_capability_off';

SET LOCAL role = 'postgres';
SELECT is(
  (SELECT state::text FROM public.capabilities WHERE key = 'test_capability_off'),
  'off',
  'a moderator cannot update a capability'
);

SELECT tests.set_claims('33333333-3333-3333-3333-333333333333'::uuid);
SET LOCAL role = 'authenticated';

SELECT lives_ok(
  $$
    INSERT INTO public.capabilities (key, state) VALUES ('test_capability_admin', 'on')
  $$,
  'an admin can insert a capability'
);

SET LOCAL role = 'postgres';
SELECT tests.set_claims(NULL);

SELECT * FROM finish();
ROLLBACK;
