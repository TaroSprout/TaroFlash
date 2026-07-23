-- =============================================================================
-- Lock down invoke_cleanup_media() to owner (postgres) only
-- =============================================================================
--
-- invoke_cleanup_media() is SECURITY DEFINER: it reads the service_role key out
-- of Vault and POSTs to the cleanup-media edge function with a valid
-- `Bearer <service_role_key>`. It was granted to anon + authenticated, which put
-- it on PostgREST's RPC surface (POST /rest/v1/rpc/invoke_cleanup_media) — so any
-- holder of the public anon key could trigger a full service-role storage sweep,
-- sailing straight past the edge function's own caller-auth gate.
--
-- The hourly pg_cron job runs as `postgres`, which OWNS this function and so
-- always retains EXECUTE regardless of grants. Revoking every other grant means
-- only the scheduled system job can trigger the sweep — nothing is broken.
--
-- REVOKE ... FROM PUBLIC only removes the default PUBLIC grant; the explicit
-- role grants are separate, so each is revoked by name.
REVOKE ALL ON FUNCTION public.invoke_cleanup_media() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.invoke_cleanup_media() FROM anon;
REVOKE ALL ON FUNCTION public.invoke_cleanup_media() FROM authenticated;
REVOKE ALL ON FUNCTION public.invoke_cleanup_media() FROM service_role;
