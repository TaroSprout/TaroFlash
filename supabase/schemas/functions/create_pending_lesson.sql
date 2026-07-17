-- Generated from pg_dump via scripts/dump-schemas; edit freely — this file is
-- the canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.create_pending_lesson(p_collection_id bigint, p_title text, p_audio_path text, p_script text DEFAULT 'original'::text, p_lang text DEFAULT NULL::text, p_chunks jsonb DEFAULT '[]'::jsonb) RETURNS public.lessons
    LANGUAGE plpgsql
    AS $$
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


ALTER FUNCTION public.create_pending_lesson(p_collection_id bigint, p_title text, p_audio_path text, p_script text, p_lang text, p_chunks jsonb) OWNER TO postgres;


GRANT ALL ON FUNCTION public.create_pending_lesson(p_collection_id bigint, p_title text, p_audio_path text, p_script text, p_lang text, p_chunks jsonb) TO anon;
GRANT ALL ON FUNCTION public.create_pending_lesson(p_collection_id bigint, p_title text, p_audio_path text, p_script text, p_lang text, p_chunks jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.create_pending_lesson(p_collection_id bigint, p_title text, p_audio_path text, p_script text, p_lang text, p_chunks jsonb) TO service_role;

