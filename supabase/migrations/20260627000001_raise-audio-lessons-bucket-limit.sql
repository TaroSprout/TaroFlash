-- =============================================================================
-- Audio Reader: raise the audio-lessons size cap for long audio
-- =============================================================================
--
-- The old 25 MiB cap mirrored Whisper's per-file limit, back when the uploaded
-- file WAS the single Whisper input. Now the client transcodes to a compact mono
-- MP3 and slices long audio into chunks, so individual objects are small — but a
-- multi-hour book's full playback file can still exceed 25 MiB. Raise to 200 MiB
-- (~9 h of 48 kbps mono). A targeted UPDATE on the shipped bucket row is the right
-- tool — it's an idempotent settings change, not a schema change.
-- =============================================================================

update storage.buckets
set file_size_limit = 209715200
where id = 'audio-lessons';
