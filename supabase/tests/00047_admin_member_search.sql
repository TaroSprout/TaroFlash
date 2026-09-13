BEGIN;

SELECT plan(10);

-- public.member_search_result exposes only the four safe columns — never role/plan/billing.
SELECT bag_eq(
  $$ SELECT attname
     FROM pg_attribute
     WHERE attrelid = 'public.member_search_result'::regclass
       AND attnum > 0
       AND NOT attisdropped $$,
  $$ VALUES ('id'), ('display_name'), ('avatar_url'), ('email') $$,
  'member_search_result exposes only id, display_name, avatar_url, email'
);

SELECT is(
  has_function_privilege('anon', 'public.search_members(text)', 'EXECUTE'),
  false,
  'anon cannot execute search_members()'
);

SELECT tests.create_user('a0000000-0000-0000-0000-000000000001'::uuid, 'mallory');
SELECT tests.create_user('a0000000-0000-0000-0000-000000000002'::uuid, 'ada_admin');
UPDATE public.members SET role = 'admin' WHERE id = 'a0000000-0000-0000-0000-000000000002';

SELECT tests.create_user('a0000000-0000-0000-0000-000000000003'::uuid, 'CarolMatchable');
UPDATE public.members SET email = 'carol@zzzmailbox.test'
  WHERE id = 'a0000000-0000-0000-0000-000000000003';

SELECT tests.create_user('a0000000-0000-0000-0000-000000000004'::uuid, 'DeletedTarget');
UPDATE public.members SET delete_at = now()
  WHERE id = 'a0000000-0000-0000-0000-000000000004';

SELECT tests.set_claims('a0000000-0000-0000-0000-000000000001'::uuid);
SET LOCAL role = 'authenticated';

SELECT is(
  (SELECT count(*)::int FROM public.search_members('carolmatch')),
  0,
  'a non-admin caller gets zero rows, even for a term matching a real member'
);

SET LOCAL role = 'postgres';
SELECT tests.set_claims('a0000000-0000-0000-0000-000000000002'::uuid);
SET LOCAL role = 'authenticated';

SELECT is(
  (SELECT display_name FROM public.search_members('carolmatch')),
  'CarolMatchable',
  'admin matches on display_name, case-insensitive substring'
);

SELECT is(
  (SELECT display_name FROM public.search_members('zzzmailbox')),
  'CarolMatchable',
  'admin matches on email, case-insensitive substring'
);

SELECT is(
  (SELECT count(*)::int FROM public.search_members('a')),
  0,
  'a query under 2 characters (after trim) returns nothing, even to an admin'
);

SELECT is(
  (SELECT count(*)::int FROM public.search_members(' a ')),
  0,
  'a query that trims to under 2 characters returns nothing'
);

SELECT is(
  (SELECT count(*)::int FROM public.search_members('deletedtarget')),
  0,
  'a member with delete_at stamped is excluded even for an admin'
);

SET LOCAL role = 'postgres';
SELECT tests.set_claims(NULL);

-- Cap + ordering: 25 members share a distinct substring, sorted by display_name.
DO $$
DECLARE
  i int;
BEGIN
  FOR i IN 1..25 LOOP
    PERFORM tests.create_user(
      ('b0000000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid,
      'SearchCap' || lpad(i::text, 2, '0')
    );
  END LOOP;
END $$;

SELECT tests.set_claims('a0000000-0000-0000-0000-000000000002'::uuid);
SET LOCAL role = 'authenticated';

SELECT is(
  (SELECT count(*)::int FROM public.search_members('searchcap')),
  20,
  'results are capped at 20 rows'
);

SELECT is(
  ARRAY(SELECT display_name FROM public.search_members('searchcap')),
  ARRAY(SELECT display_name FROM public.search_members('searchcap') ORDER BY display_name),
  'results are ordered by display_name'
);

SET LOCAL role = 'postgres';
SELECT tests.set_claims(NULL);

SELECT * FROM finish();
ROLLBACK;
