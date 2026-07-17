-- Generated from pg_dump via scripts/dump-schemas; edit freely — this file is
-- the canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.auth_role() RETURNS public.member_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select role from public.members where id = auth.uid()
$$;


ALTER FUNCTION public.auth_role() OWNER TO postgres;


GRANT ALL ON FUNCTION public.auth_role() TO anon;
GRANT ALL ON FUNCTION public.auth_role() TO authenticated;
GRANT ALL ON FUNCTION public.auth_role() TO service_role;

