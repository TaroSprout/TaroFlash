-- Generated from pg_dump via scripts/dump-schemas; edit freely — this file is
-- the canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.trigger_lesson_processing() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  if new.status = 'processing'
     and new.phase is not null
     and (tg_op = 'INSERT'
          or new.phase is distinct from old.phase
          or new.chunk_cursor is distinct from old.chunk_cursor)
  then
    -- Side effect only: never let a failed kick abort the row write (see the
    -- original chain migration). The reaper settles the row if the kick is lost.
    begin
      perform public.invoke_lesson_process(new.id);
    exception
      when others then
        raise warning 'lesson % chain kick failed: %', new.id, sqlerrm;
    end;
  end if;
  return new;
end;
$$;


ALTER FUNCTION public.trigger_lesson_processing() OWNER TO postgres;


GRANT ALL ON FUNCTION public.trigger_lesson_processing() TO anon;
GRANT ALL ON FUNCTION public.trigger_lesson_processing() TO authenticated;
GRANT ALL ON FUNCTION public.trigger_lesson_processing() TO service_role;

