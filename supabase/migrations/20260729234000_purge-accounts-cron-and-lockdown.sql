-- =============================================================================
-- Daily account purge: schedule it, and lock down who may trigger it
-- =============================================================================
--
-- Hand-written because none of this is visible to `supabase db diff`: cron
-- scheduling is DML in the cron schema, and function EXECUTE grants come from
-- default privileges rather than the schema definition. The function body itself
-- lives in supabase/schemas/20_members.sql and arrives via the generated
-- migration alongside this one.
--
-- No new Vault secrets. `supabase_url` and `service_role_key` were provisioned
-- for invoke_cleanup_media() and are reused as-is.
--
-- LOCAL GOTCHA: `supabase_url` must be the kong hostname for pg_net to reach the
-- edge function from inside the database container — 127.0.0.1 is the container
-- itself, not the gateway:
--   UPDATE vault.secrets SET secret = 'http://supabase_kong_TaroFlash:8000'
--   WHERE name = 'supabase_url';

-- -----------------------------------------------------------------------------
-- 1. Lock down EXECUTE
--
--    invoke_purge_accounts() is SECURITY DEFINER: it reads the service_role key
--    out of Vault and calls the edge function with it. Left on PostgREST's RPC
--    surface, any holder of the public anon key could POST
--    /rest/v1/rpc/invoke_purge_accounts and trigger a service-role purge of every
--    expired account — the edge function's own caller gate would see a valid
--    service_role token and wave it through.
--
--    cleanup-media shipped without this and needed migration 20260723160000 to
--    claw the grants back afterwards. This one ships locked.
--
--    The cron job runs as `postgres`, which OWNS the function and therefore keeps
--    EXECUTE no matter what is revoked here. Nothing legitimate breaks.
--
--    REVOKE ... FROM PUBLIC only drops the default PUBLIC grant; the per-role
--    grants are separate ACL entries and each must be named.
REVOKE ALL ON FUNCTION public.invoke_purge_accounts() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.invoke_purge_accounts() FROM anon;
REVOKE ALL ON FUNCTION public.invoke_purge_accounts() FROM authenticated;
REVOKE ALL ON FUNCTION public.invoke_purge_accounts() FROM service_role;


-- -----------------------------------------------------------------------------
-- 2. Schedule it daily at 03:30 UTC
--
--    Daily rather than hourly: `delete_at` is a 30-day deadline, so purging
--    within a day of it is well inside the window, and a job that erases
--    accounts is one to run rarely and predictably. Off-peak because the
--    auth.users cascade deletes every row a member owns.
--
--    unschedule first so re-running this migration against a database that
--    already has the job is not an error. cron.unschedule raises if the job is
--    missing, hence the guard.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-accounts-daily') THEN
    PERFORM cron.unschedule('purge-accounts-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'purge-accounts-daily',
  '30 3 * * *',
  $$SELECT public.invoke_purge_accounts();$$
);
