-- knowledge: reap_stalled_lessons, trigger_lesson_processing — corpus/media/audio-generation.md
CREATE OR REPLACE FUNCTION public.reap_stalled_lessons() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  v_reaped integer;
begin
  -- Leave phase (and chunk_cursor) intact so retry can resume from where the
  -- job died rather than re-transcribing from the start. A pre-resume failure
  -- has phase null and still restarts.
  update public.lessons
     set status     = 'failed',
         error_code = 'stalled',
         updated_at = now()
   where status = 'processing'
     and updated_at < now() - interval '10 minutes';

  get diagnostics v_reaped = row_count;
  return v_reaped;
end;
$$;

CREATE OR REPLACE FUNCTION public.trigger_lesson_processing() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  if new.status = 'processing'
     and new.phase is not null
     and (tg_op = 'INSERT'
          or new.phase is distinct from old.phase
          or new.chunk_cursor is distinct from old.chunk_cursor
          -- Retry resume flips a failed row back to processing without moving
          -- phase or cursor, so the status flip is what re-fires the chain here.
          or old.status is distinct from new.status)
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
