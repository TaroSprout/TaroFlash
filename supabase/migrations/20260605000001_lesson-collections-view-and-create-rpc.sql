-- =============================================================================
-- Audio Reader: collection read shape + collection-aware create_lesson
-- =============================================================================
--
-- Two related changes now that lessons live under collections:
--   1. A view that pairs each collection with its lesson count, so the
--      dashboard card can show "N lessons" in a single read (same pattern as
--      decks_with_stats / cards_with_images).
--   2. create_lesson gains a collection_id, because lessons.collection_id is
--      now NOT NULL — the old 4-arg RPC would insert a collection-less row and
--      fail the constraint.
-- =============================================================================

BEGIN;

-- A collection plus its lesson count. security_invoker = true means the view
-- runs the underlying RLS as the *calling* member, not the view's owner — so
-- each member only ever sees their own collections (and counts only their own
-- lessons). The count is a correlated subquery: it re-runs per collection row,
-- counting lessons whose collection_id matches that row's id.
create view "public"."lesson_collections_with_counts"
  with (security_invoker = true) as
select
  lc.id,
  lc.member_id,
  lc.title,
  lc.created_at,
  lc.updated_at,
  (
    select count(*)::int
    from "public"."lessons" l
    where l.collection_id = lc.id
  ) as lesson_count
from "public"."lesson_collections" lc;

grant select on "public"."lesson_collections_with_counts" to "authenticated";

-- create_lesson now takes the owning collection. Adding a parameter changes the
-- function signature, and CREATE OR REPLACE can't repoint a signature — so we
-- DROP the old 4-arg version and CREATE the new one. Everything else is
-- unchanged: lesson + audio media row inserted atomically in one transaction,
-- member_id stamped by the set_member_id triggers, SECURITY INVOKER so RLS
-- still applies.
drop function "public"."create_lesson"(text, text, jsonb, text);

create function "public"."create_lesson"(
  p_collection_id bigint,
  p_title text,
  p_audio_path text,
  p_transcript jsonb,
  p_lang text default null
)
returns "public"."lessons"
language plpgsql
as $$
declare
  v_lesson public.lessons;
begin
  insert into public.lessons (collection_id, title, audio_path, transcript, lang)
  values (p_collection_id, p_title, p_audio_path, p_transcript, p_lang)
  returning * into v_lesson;

  insert into public.media (bucket, path, lesson_id)
  values ('audio-lessons', p_audio_path, v_lesson.id);

  return v_lesson;
end;
$$;

grant execute on function "public"."create_lesson"(bigint, text, text, jsonb, text) to "authenticated";

COMMIT;
