-- =============================================================================
-- Downgrade-lock: function grant lockdown + daily deck purge cron
-- =============================================================================
--
-- Hand-written because none of this is visible to `supabase db diff`: it emits
-- ZERO function grants, and cron scheduling is DML in the cron schema. The
-- function bodies live in the declarative schema and arrive via the generated
-- migration alongside this one; this file only fixes their ACLs and schedules
-- the sweep.
--
-- Reuses the `supabase_url` / `service_role_key` Vault secrets already
-- provisioned for invoke_cleanup_media / invoke_purge_accounts — though this
-- sweep needs neither, since it runs entirely in SQL (see below).

-- -----------------------------------------------------------------------------
-- 1. Lock down the new functions
--
--    A freshly-created function is EXECUTE-able by PUBLIC, and Supabase's
--    default privileges hand anon/authenticated/service_role EXECUTE on public
--    functions too. Left as-is:
--
--    * purge_downgraded_decks() is SECURITY DEFINER — any holder of the public
--      anon key could POST /rest/v1/rpc/purge_downgraded_decks and delete decks
--      as the owner, straight past RLS. It must reach NO client. The cron job
--      runs as `postgres`, which OWNS it and keeps EXECUTE regardless.
--
--    * begin_/clear_downgrade_grace() are the only writers of
--      downgrade_delete_at and belong to the stripe-webhook (service role)
--      alone; a member calling them directly could try to unlock their own
--      decks. RLS's frozen-column check already blocks the write, but keeping
--      them off the authenticated RPC surface is the real boundary.
REVOKE ALL ON FUNCTION public.purge_downgraded_decks() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_downgraded_decks() FROM anon;
REVOKE ALL ON FUNCTION public.purge_downgraded_decks() FROM authenticated;
REVOKE ALL ON FUNCTION public.purge_downgraded_decks() FROM service_role;

REVOKE ALL ON FUNCTION public.begin_downgrade_grace(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.begin_downgrade_grace(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.begin_downgrade_grace(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.begin_downgrade_grace(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.clear_downgrade_grace(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clear_downgrade_grace(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.clear_downgrade_grace(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.clear_downgrade_grace(uuid) TO service_role;

-- deck_lock_deadline() is SECURITY INVOKER and only ever reads the caller's own
-- rows through RLS, so a broad grant leaks nothing — but state it explicitly so
-- the intent is on record rather than inherited from defaults.
GRANT EXECUTE ON FUNCTION public.deck_lock_deadline(bigint) TO anon;
GRANT EXECUTE ON FUNCTION public.deck_lock_deadline(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deck_lock_deadline(bigint) TO service_role;

-- -----------------------------------------------------------------------------
-- 2. Schedule the daily deck purge
--
--    Pure SQL, so unlike purge-accounts there is no edge function to invoke —
--    cron runs purge_downgraded_decks() directly. Media reclaim rides the
--    existing deck-delete soft-delete triggers + the hourly cleanup-media reaper.
--
--    Daily rather than hourly: the deadline is 15 days out, so purging within a
--    day of it is well inside the window. 04:00 UTC, off-peak and clear of the
--    03:30 account purge.
--
--    unschedule-if-exists guard so re-running this migration is not an error.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-downgraded-decks-daily') THEN
    PERFORM cron.unschedule('purge-downgraded-decks-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'purge-downgraded-decks-daily',
  '0 4 * * *',
  $$SELECT public.purge_downgraded_decks();$$
);
