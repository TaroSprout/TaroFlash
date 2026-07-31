-- =============================================================================
-- Lock down EXECUTE on the account-deletion lifecycle functions
-- =============================================================================
--
-- WHY THIS IS A SEPARATE HAND-WRITTEN MIGRATION
--
-- `supabase db diff` does not track function EXECUTE grants. They arrive via
-- Postgres default privileges (pg_default_acl), which on a Supabase project
-- grant EXECUTE on every new public-schema function to PUBLIC — and therefore
-- to anon and authenticated. So the grants written in supabase/schemas/ are
-- documentation only: the generated migration contains none of them, and the
-- function lands wide open. cleanup-media learned this the hard way and needed
-- a follow-up migration (20260723160000) to claw the grants back after ship.
--
-- begin_account_deletion(p_member_id uuid) takes the member id as an argument,
-- so an open grant is not merely untidy — a caller holding the public anon key
-- could pass somebody else's id and mark their account pending deletion,
-- unpublishing their decks and starting the purge clock on them.
--
-- Two independent things stop that, deliberately:
--   1. these REVOKEs, which take it off PostgREST's RPC surface entirely, and
--   2. the function being SECURITY INVOKER (see supabase/schemas/20_members.sql)
--      so even a future stray grant leaves the RLS freeze on members.delete_at
--      in the way.
--
-- The edge function calls it with a service-role client, which is why
-- service_role keeps EXECUTE. `postgres` owns it and retains EXECUTE regardless.
--
-- REVOKE ... FROM PUBLIC only removes the default PUBLIC grant; explicit role
-- grants are separate ACL entries, so each role is revoked by name.
REVOKE ALL ON FUNCTION public.begin_account_deletion(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.begin_account_deletion(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.begin_account_deletion(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.begin_account_deletion(uuid) TO service_role;

-- restore_account() is called by the member themselves, so authenticated keeps
-- EXECUTE. It reads auth.uid() internally and ignores any caller-supplied id,
-- so it can only ever un-delete the caller. anon has no session and would only
-- ever hit the 'Not authenticated' raise — revoked rather than left to chance.
REVOKE ALL ON FUNCTION public.restore_account() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.restore_account() FROM anon;
GRANT EXECUTE ON FUNCTION public.restore_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_account() TO service_role;

-- active_member_id() intentionally stays granted to anon + authenticated: RLS
-- policies are evaluated as the querying role, so every role that reads a
-- policy-protected table must be able to execute it. It leaks nothing — it only
-- ever returns the caller's own id, or NULL.
