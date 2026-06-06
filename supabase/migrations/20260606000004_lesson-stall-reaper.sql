-- =============================================================================
-- Audio Reader: reaper for transcription rows that died mid-flight
-- =============================================================================
--
-- The processing chain (previous migration) advances itself by writing the next
-- phase. But if an isolate is hard-killed BEFORE it writes that phase -- platform
-- wall-clock kill, OOM, deploy, crash, or a dropped pg_net delivery -- nothing
-- advances the row and nothing settles it. It would sit in 'processing' forever.
--
-- The reaper is the backstop that removes "forever" from that sentence: a cheap
-- scheduled sweep that forces any row stuck in 'processing' past a generous
-- deadline into a terminal 'failed'/'stalled' state, which the FE shows with a
-- Retry button. It depends on nothing but the clock, so it survives every way an
-- isolate can die.
--
-- The deadline (10 min) must comfortably exceed the longest a single legitimate
-- phase can take. `updated_at` is stamped on each phase ENTRY (create, retry,
-- advance), so "updated_at older than 10 min while still processing" means that
-- one phase has been running for 10 minutes -- which only happens when its
-- isolate is dead. The worst legitimate phase (Whisper: 3 attempts x 120s +
-- backoff ~= 6 min) stays well under it.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- reap_stalled_lessons(): settle every over-deadline processing row at once.
--
--   SECURITY DEFINER so a manual call (for testing) runs with the same rights as
--   the cron job, which executes as the postgres owner. Returns the number of
--   rows reaped so cron logs / a manual call show whether it did anything.
-- -----------------------------------------------------------------------------
create or replace function "public"."reap_stalled_lessons"()
  returns integer
  language plpgsql
  security definer
as $$
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

-- -----------------------------------------------------------------------------
-- Schedule it every minute. The sweep is a single indexed UPDATE touching only
-- over-deadline rows, so running it often is cheap and keeps the worst-case
-- "stuck" window close to the deadline rather than deadline + cron interval.
--
--   View jobs:        SELECT * FROM cron.job;
--   Run immediately:  SELECT public.reap_stalled_lessons();
--   Remove:           SELECT cron.unschedule('reap-stalled-lessons');
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from cron.job where jobname = 'reap-stalled-lessons') then
    perform cron.unschedule('reap-stalled-lessons');
  end if;
end;
$$;

select cron.schedule(
  'reap-stalled-lessons',
  '* * * * *',
  'SELECT public.reap_stalled_lessons()'
);

COMMIT;
