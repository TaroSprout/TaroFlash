-- =============================================================================
-- Audio Reader: within-chapter resume position (one per book)
-- =============================================================================
--
-- The collection already bookmarks WHICH chapter the member left off on
-- (last_lesson_id). This adds WHERE in that chapter they were — the audio
-- timestamp in seconds — so a refresh resumes mid-chapter instead of at 0:00.
--
-- One position per book: the pair (last_lesson_id, last_position_seconds) is the
-- single resume point. Opening a different chapter overwrites both.
--
-- The existing lesson_collections_owner_update RLS policy already scopes writes
-- to the caller's own collection, so no new policy or RPC is needed.
-- =============================================================================

BEGIN;

-- double precision: Whisper timestamps are fractional seconds. NOT NULL DEFAULT 0
-- so existing collections (and never-played chapters) read as "start at 0:00".
alter table "public"."lesson_collections"
  add column "last_position_seconds" double precision not null default 0;

-- The view lists its columns explicitly, so the new column won't surface until
-- the view is rebuilt -- DROP + CREATE rather than rely on column expansion.
drop view "public"."lesson_collections_with_counts";

create view "public"."lesson_collections_with_counts"
  with (security_invoker = true) as
select
  lc.id,
  lc.member_id,
  lc.title,
  lc.last_lesson_id,
  lc.last_position_seconds,
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
