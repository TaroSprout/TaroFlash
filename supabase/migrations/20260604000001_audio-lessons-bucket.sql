-- =============================================================================
-- Audio Reader: `audio-lessons` storage bucket + storage.objects RLS
-- =============================================================================
--
-- Buckets are provisioned in SQL migrations, NOT config.toml — config.toml
-- buckets need `supabase seed buckets`, which doesn't run on deploy, so
-- stage/prod would diverge.
--
-- Unlike `member-images` (public, CDN-friendly tiny images), audio lessons are
-- larger member content we want access-controlled, so this bucket is PRIVATE.
-- The client reads audio through a short-lived signed URL (createSignedUrl),
-- which the owner can mint because of the SELECT policy below.
--
-- Path shape: `<member_id>/<uid>.<ext>`. foldername(name)[1] is the uploader's
-- id, and every op is gated on auth.uid() = that segment.
-- =============================================================================

BEGIN;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'audio-lessons',
  'audio-lessons',
  false,    -- private; served via signed URLs
  26214400, -- 25 MiB — matches OpenAI Whisper's per-file cap
  array['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm', 'audio/ogg']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- The SELECT policy is load-bearing, not optional. supabase-js upsert-upload
-- emits `INSERT ... ON CONFLICT DO UPDATE`, and the ON CONFLICT probe needs
-- SELECT to check whether the object already exists. Without it, the very
-- first upload fails with "new row violates row-level security policy". It also
-- lets the owner mint signed URLs for playback.
create policy "audio_lessons_authenticated_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'audio-lessons'
  and (auth.uid())::text = (storage.foldername(name))[1]
);

create policy "audio_lessons_authenticated_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'audio-lessons'
  and (auth.uid())::text = (storage.foldername(name))[1]
);

create policy "audio_lessons_authenticated_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'audio-lessons'
  and (auth.uid())::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'audio-lessons'
  and (auth.uid())::text = (storage.foldername(name))[1]
);

create policy "audio_lessons_authenticated_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'audio-lessons'
  and (auth.uid())::text = (storage.foldername(name))[1]
);

COMMIT;
