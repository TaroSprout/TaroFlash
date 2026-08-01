-- =============================================================================
-- Downgrade-lock function grants — the SECURITY DEFINER/INVOKER lockdown from
-- 20260801230820_downgrade-lock-grants-and-cron.sql.
--
-- `supabase db diff` emits zero function grants, so this is the only thing
-- that catches a freshly-created function landing back on PUBLIC's default
-- EXECUTE the next time the schema is regenerated.
--
-- Covers [obligation]: purge_downgraded_decks(), begin_downgrade_grace(),
-- and clear_downgrade_grace() are not executable by anon or authenticated.
-- =============================================================================

BEGIN;

SELECT plan(12);

-- ── purge_downgraded_decks(): reaches NO client, not even service_role ───────
-- (the cron job runs as postgres, which owns it and keeps EXECUTE regardless)

SELECT is(
  has_function_privilege('anon', 'public.purge_downgraded_decks()', 'EXECUTE'),
  false,
  'anon cannot execute purge_downgraded_decks() [obligation]'
);

SELECT is(
  has_function_privilege('authenticated', 'public.purge_downgraded_decks()', 'EXECUTE'),
  false,
  'authenticated cannot execute purge_downgraded_decks() [obligation]'
);

SELECT is(
  has_function_privilege('service_role', 'public.purge_downgraded_decks()', 'EXECUTE'),
  false,
  'service_role cannot execute purge_downgraded_decks() — only the owner (postgres) can'
);

SELECT is(
  has_function_privilege('postgres', 'public.purge_downgraded_decks()', 'EXECUTE'),
  true,
  'postgres (owner, the role pg_cron runs as) retains EXECUTE on purge_downgraded_decks()'
);


-- ── begin_downgrade_grace(uuid): service_role (the webhook) + postgres only ──

SELECT is(
  has_function_privilege('anon', 'public.begin_downgrade_grace(uuid)', 'EXECUTE'),
  false,
  'anon cannot execute begin_downgrade_grace() [obligation]'
);

SELECT is(
  has_function_privilege('authenticated', 'public.begin_downgrade_grace(uuid)', 'EXECUTE'),
  false,
  'authenticated cannot execute begin_downgrade_grace() [obligation]'
);

SELECT is(
  has_function_privilege('service_role', 'public.begin_downgrade_grace(uuid)', 'EXECUTE'),
  true,
  'service_role (the stripe-webhook) can execute begin_downgrade_grace() [obligation]'
);

SELECT is(
  has_function_privilege('postgres', 'public.begin_downgrade_grace(uuid)', 'EXECUTE'),
  true,
  'postgres (owner) retains EXECUTE on begin_downgrade_grace()'
);


-- ── clear_downgrade_grace(uuid): service_role (the webhook) + postgres only ──

SELECT is(
  has_function_privilege('anon', 'public.clear_downgrade_grace(uuid)', 'EXECUTE'),
  false,
  'anon cannot execute clear_downgrade_grace() [obligation]'
);

SELECT is(
  has_function_privilege('authenticated', 'public.clear_downgrade_grace(uuid)', 'EXECUTE'),
  false,
  'authenticated cannot execute clear_downgrade_grace() [obligation]'
);

SELECT is(
  has_function_privilege('service_role', 'public.clear_downgrade_grace(uuid)', 'EXECUTE'),
  true,
  'service_role (the stripe-webhook) can execute clear_downgrade_grace() [obligation]'
);

SELECT is(
  has_function_privilege('postgres', 'public.clear_downgrade_grace(uuid)', 'EXECUTE'),
  true,
  'postgres (owner) retains EXECUTE on clear_downgrade_grace()'
);

SELECT * FROM finish();
ROLLBACK;
