-- =============================================================================
-- Audio Reader: async transcription job state on `lessons`
-- =============================================================================
--
-- Transcription is moving off the synchronous upload request into a background
-- worker. The lesson row is now created up front in a `processing` state and a
-- worker fills in the transcript afterwards, so the row has to carry that
-- lifecycle: what state it's in, why it failed, which step it's on, and which
-- script a retry should reproduce.
-- =============================================================================

BEGIN;

-- `status` drives the FE card state. Default 'ready' so every EXISTING lesson
-- (already fully transcribed) stays valid with no backfill; create_pending_lesson
-- below inserts new rows as 'processing'. The CHECK constraint pins the column
-- to the three known states — a lightweight enum without a separate type.
alter table "public"."lessons"
  add column "status" text not null default 'ready'
    check ("status" in ('processing', 'ready', 'failed'));

-- Machine-readable failure reason (e.g. 'timeout', 'rate_limited',
-- 'invalid_audio') set when status = 'failed', so the FE shows a specific
-- message and offers Retry. NULL while processing or ready.
alter table "public"."lessons"
  add column "error_code" text;

-- The current background step ('transcribing' | 'translating' |
-- 'transliterating') for progress UX. NULL once the row settles.
alter table "public"."lessons"
  add column "phase" text;

-- The Chinese-script conversion requested at upload ('original' | 'simplified' |
-- 'traditional'). Persisted so a retry re-transcribes with the same setting.
alter table "public"."lessons"
  add column "script" text not null default 'original';

-- create_pending_lesson: insert a lesson in the `processing` state (empty
-- transcript) plus its audio media row, atomically — the async sibling of
-- create_lesson. The worker fills transcript/lang and flips status to 'ready'
-- (or 'failed') afterwards. SECURITY INVOKER (default) so RLS applies and the
-- set_member_id trigger stamps member_id from auth.uid().
create function "public"."create_pending_lesson"(
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
begin
  insert into public.lessons (collection_id, title, audio_path, transcript, lang, status, script)
  values (p_collection_id, p_title, p_audio_path, '{}'::jsonb, p_lang, 'processing', p_script)
  returning * into v_lesson;

  insert into public.media (bucket, path, lesson_id)
  values ('audio-lessons', p_audio_path, v_lesson.id);

  return v_lesson;
end;
$$;

grant execute on function "public"."create_pending_lesson"(bigint, text, text, text, text) to "authenticated";

COMMIT;
