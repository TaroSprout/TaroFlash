-- =============================================================================
-- Route lesson audio through the media table
-- =============================================================================
--
-- Audio objects in the `audio-lessons` bucket now get a `media` row, exactly
-- like card/deck images. That buys us the existing lifecycle for free:
--   - the member-delete trigger already marks ALL of a member's media deleted,
--   - the cleanup-media cron (bucket-agnostic) reaps the orphaned objects.
-- We add the lesson half: a lesson_id link + a lesson-delete soft-delete trigger
-- + an atomic create_lesson RPC.
-- =============================================================================

BEGIN;

-- Link a media row to its lesson, mirroring media.card_id / media.deck_id.
-- The FK is NO ACTION (the default) — the trigger below clears lesson_id before
-- a lesson row is removed, so the FK never blocks the delete.
ALTER TABLE public.media
  ADD COLUMN lesson_id bigint;

ALTER TABLE public.media
  ADD CONSTRAINT media_lesson_id_fkey
  FOREIGN KEY (lesson_id) REFERENCES public.lessons (id);

-- Before a lesson row is physically deleted, soft-delete its audio media row and
-- NULL lesson_id. Two details copied from the hardened card/deck triggers:
--   - clear lesson_id for ALL referencing rows (no `deleted_at IS NULL` guard) —
--     otherwise an already-soft-deleted row keeps lesson_id and FK-blocks the
--     members -> lessons cascade.
--   - COALESCE(deleted_at, now()) stamps still-live rows for the cleanup cron
--     while preserving an existing soft-delete time.
-- public.media is fully qualified so the trigger works under roles whose
-- search_path lacks public (e.g. supabase_auth_admin runs the account cascade).
CREATE OR REPLACE FUNCTION public.soft_delete_media_before_lesson_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.media
  SET
    deleted_at = COALESCE(deleted_at, now()),
    lesson_id  = NULL
  WHERE lesson_id = OLD.id;

  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_lesson_delete_soft_delete_media
  BEFORE DELETE ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.soft_delete_media_before_lesson_delete();

-- Create a lesson and its audio media row atomically. Both inserts run inside
-- this one function, so they share a transaction: if the media insert fails the
-- lesson insert rolls back, and we never persist a lesson whose audio wouldn't
-- be reaped on delete. member_id on both rows is stamped by the existing
-- set_member_id triggers. The function is SECURITY INVOKER (the default), so RLS
-- still applies — the caller must own what they insert.
CREATE OR REPLACE FUNCTION public.create_lesson(
  p_title text,
  p_audio_path text,
  p_transcript jsonb,
  p_lang text DEFAULT NULL
)
RETURNS public.lessons
LANGUAGE plpgsql
AS $$
DECLARE
  v_lesson public.lessons;
BEGIN
  INSERT INTO public.lessons (title, audio_path, transcript, lang)
  VALUES (p_title, p_audio_path, p_transcript, p_lang)
  RETURNING * INTO v_lesson;

  INSERT INTO public.media (bucket, path, lesson_id)
  VALUES ('audio-lessons', p_audio_path, v_lesson.id);

  RETURN v_lesson;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_lesson(text, text, jsonb, text) TO authenticated;

COMMIT;
