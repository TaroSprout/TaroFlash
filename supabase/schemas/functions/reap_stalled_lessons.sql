-- Generated from pg_dump via scripts/dump-schemas; edit freely — this file is
-- the canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.reap_stalled_lessons() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  v_reaped integer;
begin
  update public.lessons
     set status     = 'failed',
         phase      = null,
         error_code = 'stalled',
         updated_at = now()
   where status = 'processing'
     and updated_at < now() - interval '10 minutes';

  get diagnostics v_reaped = row_count;
  return v_reaped;
end;
$$;


ALTER FUNCTION public.reap_stalled_lessons() OWNER TO postgres;


GRANT ALL ON FUNCTION public.reap_stalled_lessons() TO anon;
GRANT ALL ON FUNCTION public.reap_stalled_lessons() TO authenticated;
GRANT ALL ON FUNCTION public.reap_stalled_lessons() TO service_role;

