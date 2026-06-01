-- =============================================================================
-- Replace the per-card `cards` bucket with a general `member-images` bucket
-- =============================================================================
--
-- Old scheme: every card face uploaded a unique object at
--   cards/<member_id>/<card_id>/<side>/<uid>.<ext>
-- Baking card_id + a random uid into the path guaranteed one physical object
-- per card face, so reusing the same image (deck bg, card bg) wasted storage.
--
-- New scheme: content-addressed, member-scoped, usage-neutral:
--   member-images/<member_id>/<sha256-of-bytes>.<ext>
-- Identical bytes for the same member collapse to a single object. Which card
-- (and side) uses it is recorded in public.media (card_id + slot), not in the
-- path. The bucket is now a dumb content store shared across card images and
-- (later) deck backgrounds.
--
-- Fresh start (no backfill): existing card-image media rows are discarded here.
-- The old bucket's storage objects + the bucket row itself can't be removed
-- from SQL (storage.protect_delete blocks direct deletes of storage tables) —
-- they're emptied + dropped via the Storage API out-of-band. The dedupe-slot
-- trigger and the (card_id, slot) unique index from earlier migrations carry
-- over unchanged.
-- =============================================================================

BEGIN;

-- Fresh start: discard old card-image references. public.media is our own
-- table (no storage guard), so this is a plain DELETE. The orphaned objects in
-- the `cards` bucket are emptied via the Storage API separately.
DELETE FROM public.media WHERE bucket = 'cards';

-- Retire the old bucket's RLS policies (the bucket row is dropped via the
-- Storage API, since SQL can't delete storage tables).
DROP POLICY IF EXISTS "cards_bucket_authenticated_select" ON storage.objects;
DROP POLICY IF EXISTS "cards_bucket_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "cards_bucket_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "cards_bucket_authenticated_delete" ON storage.objects;

-- -----------------------------------------------------------------------------
-- New general, per-member image bucket.
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'member-images',
  'member-images',
  true,
  10485760, -- 10 MiB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- storage.objects RLS for `member-images`.
--
-- Path shape: `<member_id>/<sha256>.<ext>`; foldername(name)[1] is the
-- uploader's member_id. All four ops gated on auth.uid() = that segment, so a
-- member can only touch their own folder.
--
-- The SELECT policy is load-bearing for uploads: supabase-js upsert-upload
-- emits `INSERT ... ON CONFLICT DO UPDATE`, which needs SELECT for the conflict
-- check. Re-uploading identical bytes (same hash → same path) hits that UPDATE
-- branch, so the UPDATE policy matters too.
-- -----------------------------------------------------------------------------
CREATE POLICY "member_images_authenticated_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'member-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "member_images_authenticated_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'member-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "member_images_authenticated_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'member-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'member-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "member_images_authenticated_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'member-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

COMMIT;
