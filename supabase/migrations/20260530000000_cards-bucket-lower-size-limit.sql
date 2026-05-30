-- =============================================================================
-- Lower the `cards` bucket size backstop from 10 MiB to 5 MiB
-- =============================================================================
--
-- The frontend now enforces the real per-callsite limits (card images cap at
-- 2 MiB). This bucket limit is only a coarse backstop against a bypassed or
-- malicious client, so 10 MiB was needlessly generous. 5 MiB stays comfortably
-- above every frontend cap while shrinking the worst case.
--
-- The bucket row already exists (created in 20260416000007), so this is a
-- targeted UPDATE, not another INSERT ... ON CONFLICT. Re-running it is a no-op
-- once the value matches.
-- =============================================================================

BEGIN;

UPDATE storage.buckets
SET file_size_limit = 5242880 -- 5 MiB
WHERE id = 'cards';

COMMIT;
