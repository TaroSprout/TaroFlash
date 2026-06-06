-- =============================================================================
-- Gate card-image media behind the paid plan + reap true storage orphans
-- =============================================================================
--
-- Two related changes:
--
--   1. Card images are a paid feature. The frontend shows an upgrade prompt, but
--      that's just UX — the real boundary is here: the media INSERT policy now
--      rejects a card-image row unless the caller is on the paid plan.
--
--   2. A blocked (or failed) upload uploads the bytes to storage but never gets
--      a media row. The cleanup-media cron is media-table-driven and can't see
--      such objects, so they'd leak forever. We add a finder the cron uses to
--      sweep those true orphans (the edge function does the actual delete, since
--      storage.protect_delete blocks deleting storage rows from SQL).
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Paid-plan gate on card-image media INSERT
--
--    Replaces the prior INSERT policy (from 20260411000002). The ownership check
--    (auth.uid() = member_id) is unchanged; we AND on a plan check that applies
--    ONLY to card slots, so audio (slot IS NULL) and any future deck media stay
--    free.
--
--    The coalesce is load-bearing. `slot` is nullable, and in SQL three-valued
--    logic `NULL in ('card_front','card_back')` is NULL — not false. Without the
--    coalesce, `not (NULL)` is NULL, the whole WITH CHECK is NULL → treated as
--    false, and a free member's audio insert would be wrongly rejected. Coalesce
--    collapses "unknown" to "not a card slot" so non-card media is unaffected.
--
--    auth_plan() (added in 20260417000000) is a SECURITY DEFINER lookup that
--    returns the caller's plan from public.members.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.media;

CREATE POLICY "Enable insert for authenticated users only"
  ON public.media
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = member_id
    AND (
      NOT COALESCE(slot IN ('card_front', 'card_back'), false)
      OR auth_plan() = 'paid'
    )
  );

-- -----------------------------------------------------------------------------
-- 2. Supporting index for the (bucket, path) lookups
--
--    Both the existing refcount sweep and the new orphan finder probe media by
--    (bucket, path). This btree index turns those probes into index lookups.
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS media_bucket_path_idx ON public.media (bucket, path);

-- -----------------------------------------------------------------------------
-- 3. Orphan finder for the cleanup cron
--
--    Returns storage objects with no backing media row, so the cron can remove
--    them. Notes on the design:
--
--    - SECURITY DEFINER: storage.objects isn't readable by the cron's role on
--      its own. The function runs as its owner (which can read storage), and we
--      grant EXECUTE only to service_role so authenticated users can't enumerate
--      other people's object names. search_path is pinned (defence against
--      search_path hijacking on a definer function).
--
--    - bucket_id IN (SELECT DISTINCT bucket FROM media): only sweep buckets that
--      are media-tracked. A bucket whose objects aren't recorded in media (e.g.
--      a future avatars bucket) would look entirely orphaned — restricting to
--      tracked buckets keeps it safe and self-maintaining.
--
--    - created_at < now() - p_older_than: the normal flow uploads bytes THEN
--      inserts the media row. This grace window skips that gap so we never delete
--      a valid object whose row is seconds behind.
--
--    - NOT EXISTS (any media row, active or soft-deleted): an object that still
--      has a soft-deleted row is left to the existing refcount sweep; this finder
--      only targets objects that never had a row at all.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.find_orphan_storage_objects(
  p_older_than interval DEFAULT interval '1 hour',
  p_limit      int DEFAULT 500
)
RETURNS TABLE (bucket text, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT o.bucket_id, o.name
  FROM storage.objects o
  WHERE o.bucket_id IN (SELECT DISTINCT m.bucket FROM public.media m)
    AND o.created_at < now() - p_older_than
    AND NOT EXISTS (
      SELECT 1
      FROM public.media m
      WHERE m.bucket = o.bucket_id
        AND m.path = o.name
    )
  LIMIT p_limit;
$$;

-- Supabase grants EXECUTE on new public functions to anon + authenticated
-- explicitly (via ALTER DEFAULT PRIVILEGES), so REVOKE FROM public alone leaves
-- those grants in place. This function is SECURITY DEFINER and reads every
-- member's storage.objects, so it must be locked to service_role (the cron) —
-- revoke the role grants by name, then grant only what's needed.
REVOKE ALL ON FUNCTION public.find_orphan_storage_objects(interval, int) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_orphan_storage_objects(interval, int) TO service_role;

COMMIT;
