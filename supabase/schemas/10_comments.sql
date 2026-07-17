-- Generated from pg_dump via scripts/dump-schemas; edit freely — this file is
-- the canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

COMMENT ON SCHEMA public IS 'standard public schema';


COMMENT ON TABLE public.shop_items IS 'Items purchasable in the shop';


COMMENT ON TABLE public.purchases IS 'Junction table to link members to their purchased items';

