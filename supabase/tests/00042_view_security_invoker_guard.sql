-- =============================================================================
-- Guard: every public view runs as the caller
-- =============================================================================
-- A view without `security_invoker` executes as its owner (postgres), so RLS on
-- the tables underneath stops applying per-caller and it hands back every
-- member's rows.
--
-- This is a whole-class guard rather than a per-view test because the failure
-- is silent and arrives by accident: any change that forces a view to be
-- dropped and recreated resets its reloptions, and `supabase db diff` does not
-- compare reloptions — it reports "No schema changes found" against a schema
-- file that declares the option. That exact sequence shipped a broken
-- cards_with_images during the card-rank migration.
--
-- Deliberately queries pg_class rather than naming views, so a view added
-- tomorrow is covered without anyone remembering this file exists.
-- =============================================================================

BEGIN;

SELECT plan(1);

SELECT is_empty(
  $$
    SELECT c.relname::text
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind IN ('v', 'm')
       AND NOT COALESCE(
             (SELECT option_value
                FROM pg_options_to_table(c.reloptions)
               WHERE option_name = 'security_invoker') = 'true',
             false)
     ORDER BY 1
  $$,
  'every view in public sets security_invoker=true, so RLS applies per-caller'
);

SELECT * FROM finish();
ROLLBACK;
