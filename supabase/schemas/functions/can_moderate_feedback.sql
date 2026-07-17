-- Generated from pg_dump via scripts/dump-schemas; edit freely — this file is
-- the canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.can_moderate_feedback() RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT auth_role() IN ('admin', 'moderator')
$$;


ALTER FUNCTION public.can_moderate_feedback() OWNER TO postgres;


REVOKE ALL ON FUNCTION public.can_moderate_feedback() FROM PUBLIC;
GRANT ALL ON FUNCTION public.can_moderate_feedback() TO service_role;
GRANT ALL ON FUNCTION public.can_moderate_feedback() TO authenticated;

