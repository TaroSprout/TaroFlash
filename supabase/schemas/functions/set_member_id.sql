-- Generated from pg_dump via scripts/dump-schemas; edit freely — this file is
-- the canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.set_member_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  new.member_id := auth.uid();
  return new;
end;
$$;


ALTER FUNCTION public.set_member_id() OWNER TO postgres;


GRANT ALL ON FUNCTION public.set_member_id() TO anon;
GRANT ALL ON FUNCTION public.set_member_id() TO authenticated;
GRANT ALL ON FUNCTION public.set_member_id() TO service_role;

