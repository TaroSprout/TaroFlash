-- Generated from pg_dump via scripts/dump-schemas; edit freely — this file is
-- the canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.add_or_update_purchase(member uuid, item integer, qty integer) RETURNS void
    LANGUAGE plpgsql
    AS $$BEGIN
    INSERT INTO purchases (member_id, item_id, quantity)
    VALUES (member, item, qty)
    ON CONFLICT (member_id, item_id)
    DO UPDATE SET
        quantity = purchases.quantity + EXCLUDED.quantity;
END;$$;


ALTER FUNCTION public.add_or_update_purchase(member uuid, item integer, qty integer) OWNER TO postgres;


GRANT ALL ON FUNCTION public.add_or_update_purchase(member uuid, item integer, qty integer) TO anon;
GRANT ALL ON FUNCTION public.add_or_update_purchase(member uuid, item integer, qty integer) TO authenticated;
GRANT ALL ON FUNCTION public.add_or_update_purchase(member uuid, item integer, qty integer) TO service_role;

