BEGIN;

SELECT plan(5);

INSERT INTO public.capabilities (key, state) VALUES ('test_list_grants_targeted', 'targeted');
INSERT INTO public.capabilities (key, state) VALUES ('test_list_grants_empty', 'targeted');

SELECT tests.create_user('11111111-1111-1111-1111-111111111112'::uuid, 'lg_gina_granted');
SELECT tests.create_user('22222222-2222-2222-2222-222222222223'::uuid, 'lg_nick_notadmin');
SELECT tests.create_user('33333333-3333-3333-3333-333333333334'::uuid, 'lg_amy_admin');

UPDATE public.members SET role = 'admin'
  WHERE id = '33333333-3333-3333-3333-333333333334';

INSERT INTO public.capability_grants (key, member_id, granted_by)
VALUES (
  'test_list_grants_targeted',
  '11111111-1111-1111-1111-111111111112',
  '33333333-3333-3333-3333-333333333334'
);

SELECT tests.set_claims('33333333-3333-3333-3333-333333333334'::uuid);
SET LOCAL role = 'authenticated';

SELECT results_eq(
  $$
    SELECT m.display_name, m.avatar_url
    FROM public.list_capability_grants('test_list_grants_targeted') g
    JOIN public.members m ON m.id = g.id
  $$,
  $$
    SELECT display_name, avatar_url FROM public.members
    WHERE id = '11111111-1111-1111-1111-111111111112'
  $$,
  'an admin caller gets the granted member''s display_name and avatar_url back'
);

SELECT is(
  (SELECT count(*)::int FROM public.list_capability_grants('test_list_grants_targeted')
    WHERE granted_at IS NOT NULL),
  1,
  'an admin caller gets granted_at back for the granted member'
);

SET LOCAL role = 'postgres';
SELECT tests.set_claims('22222222-2222-2222-2222-222222222223'::uuid);
SET LOCAL role = 'authenticated';

SELECT is(
  (SELECT count(*)::int FROM public.list_capability_grants('test_list_grants_targeted')),
  0,
  'a non-admin caller gets zero rows'
);

SET LOCAL role = 'postgres';
SELECT tests.set_claims('33333333-3333-3333-3333-333333333334'::uuid);
SET LOCAL role = 'authenticated';

SELECT is(
  (SELECT count(*)::int FROM public.list_capability_grants('test_list_grants_empty')),
  0,
  'an empty allow-list yields zero rows even for an admin'
);

SET LOCAL role = 'postgres';
SELECT tests.set_claims(NULL);

SELECT is(
  has_function_privilege('anon', 'public.list_capability_grants(text)', 'EXECUTE'),
  false,
  'anon cannot execute list_capability_grants()'
);

SELECT * FROM finish();
ROLLBACK;
