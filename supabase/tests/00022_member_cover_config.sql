-- =============================================================================
-- members.cover_config: column exists, nullable, and is writable only by the
-- owning member (same RLS policy as the rest of the members row).
-- =============================================================================

BEGIN;

SELECT plan(3);

-- ── Setup (as postgres superuser) ─────────────────────────────────────────────

SELECT tests.create_user('44444444-4444-4444-4444-444444444444'::uuid, 'carol');
SELECT tests.create_user('55555555-5555-5555-5555-555555555555'::uuid, 'dave');

-- Test 1: column exists and defaults to NULL for a freshly-created member
SELECT is(
  (SELECT cover_config FROM public.members WHERE id = '44444444-4444-4444-4444-444444444444'),
  NULL,
  'cover_config defaults to NULL on member creation'
);

-- ── Act as Carol ──────────────────────────────────────────────────────────────

SELECT tests.set_claims('44444444-4444-4444-4444-444444444444'::uuid);
SET LOCAL role = 'authenticated';

-- Test 2: Carol can persist her own cover_config
SELECT lives_ok(
  $$
    UPDATE public.members
    SET cover_config = '{"theme": "red-500", "theme_dark": "red-700", "pattern": "wave"}'::jsonb
    WHERE id = '44444444-4444-4444-4444-444444444444'
  $$,
  'Carol can update her own cover_config'
);

-- Test 3: Carol cannot update Dave's cover_config (existing members RLS policy)
UPDATE public.members
SET cover_config = '{"theme": "hacked"}'::jsonb
WHERE id = '55555555-5555-5555-5555-555555555555';

SET LOCAL role = 'postgres';
SELECT is(
  (SELECT cover_config FROM public.members WHERE id = '55555555-5555-5555-5555-555555555555'),
  NULL,
  'Carol cannot update Dave''s cover_config'
);

SELECT * FROM finish();
ROLLBACK;
