-- =============================================================================
-- Audio Reader: chapter ordering (lessons.position) + per-collection progress
-- =============================================================================
--
-- Lessons become ordered "chapters" of a collection (a book), and each
-- collection remembers the last chapter the member opened so the dashboard can
-- reopen the book where they left off.
--
-- Three changes:
--   1. lessons.position      — a numeric sort key for chapter order.
--   2. create_pending_lesson — stamps the next position (max + 1) server-side.
--   3. lesson_collections.last_lesson_id — the per-collection progress bookmark.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. lessons.position + backfill
-- ---------------------------------------------------------------------------

-- numeric (not int) mirrors cards.rank: a chapter can later be dropped *between*
-- two others by averaging their positions, with no renumbering of the rest.
-- Added nullable first so existing rows get a value before NOT NULL locks in
-- (same backfill -> SET NOT NULL ordering as the earlier collection_id reparent).
alter table "public"."lessons"
  add column "position" numeric;

-- Backfill: number each collection's existing lessons 1..N by upload time.
-- row_number() is a WINDOW function: PARTITION BY restarts the counter for each
-- collection, and ORDER BY created_at decides which lesson is 1, 2, 3 ... inside
-- that collection. The subquery computes (id -> row number) and the UPDATE joins
-- it back by id to write each row's position.
update "public"."lessons" l
set "position" = sub.rn
from (
  select id, row_number() over (
    partition by collection_id
    order by created_at
  ) as rn
  from "public"."lessons"
) sub
where sub.id = l.id;

alter table "public"."lessons"
  alter column "position" set not null;

-- The chapter-list query is "lessons in THIS collection, in chapter order", so a
-- composite (collection_id, position) index serves both the filter and the sort.
-- It supersedes the old plain (collection_id) index -> drop that one.
drop index "public"."lessons_collection_id_idx";

create index "lessons_collection_id_position_idx"
  on "public"."lessons" ("collection_id", "position");

-- The flat "my lessons, newest first" list no longer exists (lessons are only
-- ever read per-collection now), so its member_id+created_at index is dead
-- weight. The matching index on lesson_collections stays — the dashboard still
-- lists collections newest-first.
drop index "public"."lessons_member_id_created_at_idx";

-- ---------------------------------------------------------------------------
-- 2. create_pending_lesson: stamp the next chapter position
-- ---------------------------------------------------------------------------

-- The signature is unchanged, so CREATE OR REPLACE is enough (no DROP). The only
-- new behaviour: compute the next position (max + 1) for the collection so an
-- uploaded lesson lands at the end of the book. Keeping this server-side means
-- the FE never sends a position (same rule as card rank).
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
    (collection_id, title, audio_path, transcript, lang, status, script, "position")
  values
    (p_collection_id, p_title, p_audio_path, '{}'::jsonb, p_lang, 'processing', p_script, v_position)
  returning * into v_lesson;

  insert into public.media (bucket, path, lesson_id)
  values ('audio-lessons', p_audio_path, v_lesson.id);

  return v_lesson;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. lesson_collections.last_lesson_id (progress bookmark)
-- ---------------------------------------------------------------------------

-- Nullable FK: NULL = never opened (the dashboard starts the book at chapter 1).
-- ON DELETE SET NULL means deleting the bookmarked lesson just clears the
-- bookmark and leaves the collection intact -- contrast ON DELETE CASCADE, which
-- would delete the whole collection when one chapter is removed.
alter table "public"."lesson_collections"
  add column "last_lesson_id" bigint
    references "public"."lessons" ("id") on delete set null;

-- The view lists its columns explicitly, so a new column won't surface until the
-- view is rebuilt -- DROP + CREATE rather than rely on column expansion. The
-- existing lesson_collections_owner_update RLS policy already lets a member write
-- last_lesson_id, so persisting progress needs no new policy or RPC.
drop view "public"."lesson_collections_with_counts";

create view "public"."lesson_collections_with_counts"
  with (security_invoker = true) as
select
  lc.id,
  lc.member_id,
  lc.title,
  lc.last_lesson_id,
  lc.created_at,
  lc.updated_at,
  (
    select count(*)::int
    from "public"."lessons" l
    where l.collection_id = lc.id
  ) as lesson_count
from "public"."lesson_collections" lc;

grant select on "public"."lesson_collections_with_counts" to "authenticated";

COMMIT;
