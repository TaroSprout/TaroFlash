-- =============================================================================
-- Audio Reader: drop the dead synchronous create_lesson RPC
-- =============================================================================
--
-- create_lesson was the original synchronous "insert lesson + transcript + media
-- row in one txn" function. The async refactor replaced it with
-- create_pending_lesson (inserts a `processing` row up front; a worker fills the
-- transcript later), and nothing in the FE or edge functions calls create_lesson
-- anymore.
--
-- The previous migration made lessons.position NOT NULL, and create_lesson never
-- set a position — so it would now fail on every call. Rather than teach a dead
-- function a new trick, drop it. (create_pending_lesson is the one true insert.)
-- =============================================================================

BEGIN;

drop function "public"."create_lesson"(bigint, text, text, jsonb, text);

COMMIT;
