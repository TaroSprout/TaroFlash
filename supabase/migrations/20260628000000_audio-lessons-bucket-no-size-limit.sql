-- Remove the file_size_limit on the audio-lessons bucket.
--
-- The 200 MiB cap was sized for the 48 kbps transcription encode, but the
-- playback copy (64 kbps CBR) for a long audiobook can exceed that — a 9-hour
-- book at 64k is ~274 MiB. The client already gates the SOURCE file at 600 MiB,
-- which is the right control; a per-object bucket cap can't account for the
-- source bitrate, so NULL (unlimited) is the correct setting here.

update storage.buckets
set file_size_limit = null
where id = 'audio-lessons';
