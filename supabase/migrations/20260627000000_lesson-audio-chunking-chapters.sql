-- =============================================================================
-- Audio Reader: long-audio chunking + automatic chapters
-- =============================================================================
--
-- A long upload (a whole audiobook) can't go to Whisper in one call: Whisper caps
-- at 25 MiB / one bounded request. So the client now splits the audio into
-- ordered, overlapping slices ("chunks") and the worker transcribes them one per
-- invocation, stitching the pieces back by their time offset.
--
-- That makes 'transcribing' a LOOP, not a single step. The existing chain trigger
-- only re-fires when `phase` CHANGES — which is wrong while we stay on
-- 'transcribing' across many chunks. We add a second state-machine pointer,
-- `chunk_cursor` (the next chunk to do), and teach the trigger to re-fire when it
-- advances too. So the row drives itself chunk-by-chunk, then advances phase.
--
-- After transcription we add a new phase, 'chaptering', that reads the finished
-- transcript and splits it into titled chapters (stored in transcript.chapters).
-- Full phase order is now:
--   transcribing (×N chunks) -> chaptering -> translating -> transliterating -> ready
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Two new columns on `lessons`
--
--    `chunks` is the manifest the worker walks: an ordered jsonb array of
--    { "path": "<storage path>", "offset": <seconds> }. `offset` is where the
--    slice begins in the original audio, added back to the chunk's local Whisper
--    timestamps so the stitched transcript is on one continuous timeline.
--
--    `chunk_cursor` is the index of the NEXT chunk to transcribe — the loop
--    counter. DEFAULT on both means every existing row backfills in place with a
--    valid value (empty manifest, cursor 0) and no separate UPDATE is needed.
-- -----------------------------------------------------------------------------
alter table "public"."lessons"
  add column "chunks" jsonb not null default '[]'::jsonb;

alter table "public"."lessons"
  add column "chunk_cursor" integer not null default 0;

-- -----------------------------------------------------------------------------
-- 2. create_pending_lesson: now also stores the chunk manifest
--
--    Adding a parameter CHANGES the function signature, and Postgres can't
--    CREATE OR REPLACE across a signature change — so we DROP the old 5-arg
--    version and CREATE the 6-arg one. `p_chunks` defaults to '[]' so any caller
--    that doesn't pass it still works (the body fills in a single-chunk manifest).
--
--    Single-chunk fallback: a short file that wasn't sliced arrives with an empty
--    manifest. We synthesise one chunk pointing at audio_path itself (offset 0),
--    so the worker's loop is uniform — it never special-cases "no chunks".
-- -----------------------------------------------------------------------------
drop function if exists "public"."create_pending_lesson"(bigint, text, text, text, text);

create function "public"."create_pending_lesson"(
  p_collection_id bigint,
  p_title text,
  p_audio_path text,
  p_script text default 'original',
  p_lang text default null,
  p_chunks jsonb default '[]'::jsonb
)
returns "public"."lessons"
language plpgsql
as $$
declare
  v_lesson public.lessons;
  v_position numeric;
  v_chunks jsonb;
begin
  -- Server-assigned chapter order within the collection (max + 1), same as cards.
  select coalesce(max("position"), 0) + 1
  into v_position
  from public.lessons
  where collection_id = p_collection_id;

  -- Empty manifest -> one chunk covering the whole file from offset 0.
  if p_chunks is null or jsonb_array_length(p_chunks) = 0 then
    v_chunks := jsonb_build_array(
      jsonb_build_object('path', p_audio_path, 'offset', 0)
    );
  else
    v_chunks := p_chunks;
  end if;

  insert into public.lessons
    (collection_id, title, audio_path, transcript, lang,
     status, phase, script, "position", chunks, chunk_cursor)
  values
    (p_collection_id, p_title, p_audio_path, '{}'::jsonb, p_lang,
     'processing', 'transcribing', p_script, v_position, v_chunks, 0)
  returning * into v_lesson;

  insert into public.media (bucket, path, lesson_id)
  values ('audio-lessons', p_audio_path, v_lesson.id);

  return v_lesson;
end;
$$;

grant execute
  on function "public"."create_pending_lesson"(bigint, text, text, text, text, jsonb)
  to "authenticated";

-- -----------------------------------------------------------------------------
-- 3. Chain trigger: also re-fire when the chunk cursor advances
--
--    The guard previously fired on "entered a new phase". Now the 'transcribing'
--    phase advances `chunk_cursor` between chunks WITHOUT changing `phase`, and
--    each advance must kick the next 'process'. So we add a third OR branch:
--    `chunk_cursor` changed. `is distinct from` is the null-safe "not equal" (it
--    never yields NULL), matching the existing phase comparison.
--
--    Still no double-fire: a transcribe step changes EITHER the cursor (more
--    chunks left) OR the phase (last chunk -> chaptering), never neither — so
--    each write fires exactly one process call. Forward progress only.
-- -----------------------------------------------------------------------------
create or replace function "public"."trigger_lesson_processing"()
  returns trigger
  language plpgsql
  security definer
as $$
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

COMMIT;
