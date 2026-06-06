-- =============================================================================
-- Audio Reader: allow `.m4a` uploads (add audio/x-m4a to the bucket allowlist)
-- =============================================================================
--
-- `.m4a` has no single canonical MIME type. Browsers variously report it as
-- `audio/mp4` (already allowed) or `audio/x-m4a` (was not) — so macOS uploads
-- were rejected by Storage's content-type check before the file was ever
-- stored. Re-run the idempotent bucket upsert with the wider allowlist.
--
-- The FE now also sends a canonical content-type derived from the file
-- extension, but keeping `audio/x-m4a` here covers any client that still
-- labels the file that way.
-- =============================================================================

BEGIN;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'audio-lessons',
  'audio-lessons',
  false,
  26214400,
  array['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/webm', 'audio/ogg']
)
on conflict (id) do update set
  allowed_mime_types = excluded.allowed_mime_types;

COMMIT;
