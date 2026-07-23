-- =============================================================================
-- invoke_cleanup_media() EXECUTE lockdown
-- (20260723160000_lockdown-invoke-cleanup-media-execute.sql)
--
--   invoke_cleanup_media() is SECURITY DEFINER and POSTs to the cleanup-media
--   edge function using the Vault service_role key. It was previously granted
--   to anon + authenticated, putting it on PostgREST's RPC surface — any
--   holder of the public anon key could trigger a full service-role storage
--   sweep. The migration revokes EXECUTE from PUBLIC/anon/authenticated/
--   service_role, leaving only the owner (postgres, which the hourly pg_cron
--   job runs as) able to call it.
-- =============================================================================

BEGIN;

SELECT plan(4);

SELECT is(
  has_function_privilege('anon', 'public.invoke_cleanup_media()', 'EXECUTE'),
  false,
  'anon cannot execute invoke_cleanup_media()'
);

SELECT is(
  has_function_privilege('authenticated', 'public.invoke_cleanup_media()', 'EXECUTE'),
  false,
  'authenticated cannot execute invoke_cleanup_media()'
);

SELECT is(
  has_function_privilege('service_role', 'public.invoke_cleanup_media()', 'EXECUTE'),
  false,
  'service_role cannot execute invoke_cleanup_media()'
);

SELECT is(
  has_function_privilege('postgres', 'public.invoke_cleanup_media()', 'EXECUTE'),
  true,
  'postgres (owner, the role pg_cron runs as) retains EXECUTE on invoke_cleanup_media()'
);

SELECT * FROM finish();
ROLLBACK;
