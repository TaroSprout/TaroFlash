-- =============================================================================
-- Audio Reader: durable, DB-driven transcription chain
-- =============================================================================
--
-- Transcription used to run all three steps (transcribe -> translate ->
-- transliterate) inside ONE edge isolate kept alive by EdgeRuntime.waitUntil.
-- Their run-times add up, the platform force-kills the isolate at its wall-clock
-- limit, and the only code that settles the row (the worker's catch block) never
-- runs -- so the row is stranded in 'processing' forever.
--
-- This migration breaks the pipeline into one-step-per-invocation, driven by the
-- database instead of a long-lived isolate:
--
--   * `phase` becomes a STATE-MACHINE POINTER -- it names the step that runs
--     next ('transcribing' -> 'translating' -> 'transliterating' -> settled).
--   * The edge function gains a `process` action that runs EXACTLY ONE phase,
--     persists its result, advances `phase`, and returns normally.
--   * A trigger on `lessons` notices the row entered a new processing phase and
--     fires net.http_post back into the function to run that step. Writing the
--     next phase IS the signal to run it -- so the chain advances itself with no
--     waitUntil and no single isolate carrying the whole pipeline's wall-clock.
--
-- Reuses the pg_net + Vault plumbing already set up for cleanup-media
-- (20260411000011_cleanup-media-cron.sql): the same 'supabase_url' and
-- 'service_role_key' Vault secrets are read here.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. create_pending_lesson: seed the state machine in the 'transcribing' phase
--
--    The row is born needing step 1. Setting `phase` at insert (rather than
--    leaving it null and letting the worker set it) means the INSERT itself
--    carries the "transcribe is pending" signal the trigger below fires on.
--    CREATE OR REPLACE keeps the same RETURNS, so only the body changes — and
--    it must keep the server-side `position` (max + 1) stamping that
--    20260606000000 added, alongside the new `phase`.
-- -----------------------------------------------------------------------------
create or replace function "public"."create_pending_lesson"(
  p_collection_id bigint,
  p_title text,
  p_audio_path text,
  p_script text default 'original',
  p_lang text default null
)
returns "public"."lessons"
language plpgsql
as $$
declare
  v_lesson public.lessons;
  v_position numeric;
begin
  select coalesce(max("position"), 0) + 1
  into v_position
  from public.lessons
  where collection_id = p_collection_id;

  insert into public.lessons
    (collection_id, title, audio_path, transcript, lang, status, phase, script, "position")
  values
    (p_collection_id, p_title, p_audio_path, '{}'::jsonb, p_lang, 'processing', 'transcribing', p_script, v_position)
  returning * into v_lesson;

  insert into public.media (bucket, path, lesson_id)
  values ('audio-lessons', p_audio_path, v_lesson.id);

  return v_lesson;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. invoke_lesson_process(lesson_id): fire the edge function for one step
--
--    SECURITY DEFINER so it can read vault.decrypted_secrets (only the postgres
--    superuser can). Mirrors invoke_cleanup_media, but POSTs an explicit lesson
--    id + the 'process' action so the function knows which row and which step.
--
--    net.http_post is fire-and-forget: it enqueues the request and the pg_net
--    background worker sends it AFTER this transaction commits -- so the edge
--    function never reads the row before our phase write is durable.
-- -----------------------------------------------------------------------------
create or replace function "public"."invoke_lesson_process"(p_lesson_id bigint)
  returns void
  language plpgsql
  security definer
as $$
declare
  v_url         text;
  v_service_key text;
begin
  select decrypted_secret into v_url
  from vault.decrypted_secrets where name = 'supabase_url' limit 1;

  if v_url is null then
    raise exception
      'Vault secret "supabase_url" not found. '
      'Run: SELECT vault.create_secret(''<url>'', ''supabase_url'');';
  end if;

  select decrypted_secret into v_service_key
  from vault.decrypted_secrets where name = 'service_role_key' limit 1;

  if v_service_key is null then
    raise exception
      'Vault secret "service_role_key" not found. '
      'Run: SELECT vault.create_secret(''<key>'', ''service_role_key'');';
  end if;

  -- A phase (Whisper especially) runs well past pg_net's 5s default, so raise the
  -- timeout to the phase budget. We ignore the response either way -- the worker
  -- settles the row itself -- but this stops pg_net logging spurious timeouts and
  -- lets net._http_response capture the real result for debugging.
  perform net.http_post(
    url     := v_url || '/functions/v1/transcribe-lesson',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_service_key,
      'Content-Type',  'application/json'
    ),
    body    := jsonb_build_object('action', 'process', 'lesson_id', p_lesson_id),
    timeout_milliseconds := 150000
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. The chain trigger: a phase write drives the next step
--
--    Fires for every row, but only ACTS when the row is mid-pipeline AND just
--    entered a new phase:
--      * NEW.status = 'processing'        -> still has work to do
--      * NEW.phase  is not null           -> a step is named
--      * INSERT, or NEW.phase changed     -> we just ENTERED this phase
--                                            (IS DISTINCT FROM is the null-safe
--                                             "not equal" -- never yields null)
--
--    So: terminal writes (status -> 'ready'/'failed') don't fire; unrelated
--    edits (title, progress) on a settled row don't fire; and a same-phase
--    heartbeat (if we add one later) won't double-fire. Each phase entry fires
--    exactly one process call -- forward progress only, no loop.
-- -----------------------------------------------------------------------------
create or replace function "public"."trigger_lesson_processing"()
  returns trigger
  language plpgsql
  security definer
as $$
begin
  if new.status = 'processing'
     and new.phase is not null
     and (tg_op = 'INSERT' or new.phase is distinct from old.phase)
  then
    -- Kicking the chain is a SIDE EFFECT — it must never abort the row write
    -- that triggered it. A raise here (missing Vault secret, pg_net hiccup)
    -- would roll back the lesson insert/phase advance itself, so swallow it:
    -- the row is saved, and the reaper settles it later if the kick never lands.
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

drop trigger if exists "lesson_processing_chain" on "public"."lessons";
create trigger "lesson_processing_chain"
  after insert or update on "public"."lessons"
  for each row execute function "public"."trigger_lesson_processing"();

COMMIT;
