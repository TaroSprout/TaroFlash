-- Generated from pg_dump via scripts/dump-schemas; edit freely — this file is
-- the canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.can_manage_members() RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  select auth_role() = 'admin'
$$;


ALTER FUNCTION public.can_manage_members() OWNER TO postgres;


REVOKE ALL ON FUNCTION public.can_manage_members() FROM PUBLIC;
GRANT ALL ON FUNCTION public.can_manage_members() TO service_role;
GRANT ALL ON FUNCTION public.can_manage_members() TO authenticated;

