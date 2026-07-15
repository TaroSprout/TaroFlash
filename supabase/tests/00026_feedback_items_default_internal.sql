-- =============================================================================
-- feedback_items.visibility default: 20260715000008_feedback-items-default-internal
--
--   New feedback submissions must default to 'internal' so they stay off the
--   public community board until a moderator approves them. A raw insert that
--   doesn't specify visibility should NOT land as 'public'.
--
--   feedback_items' SELECT policy only allows visibility = 'public' OR
--   can_moderate_feedback() — a plain member can't read back their own
--   internal submission, so the assertions read back as postgres (RLS
--   bypass), same as the fixture-seeding pattern in 00024.
-- =============================================================================

BEGIN;

SELECT plan(2);

-- ── Setup ─────────────────────────────────────────────────────────────────────

SELECT tests.create_user('f6666666-6666-6666-6666-666666666666'::uuid, 'frank_fb_default');

SELECT tests.set_claims('f6666666-6666-6666-6666-666666666666'::uuid);
SET LOCAL role = 'authenticated';

-- Test 1: omitting visibility lands with the DB-level default, 'internal'.
INSERT INTO public.feedback_items (title, body, type)
VALUES ('Default Visibility Item', 'body', 'idea');

-- Test 2: explicitly supplying visibility is not overwritten by the default.
INSERT INTO public.feedback_items (title, body, type, visibility)
VALUES ('Explicit Public Item', 'body', 'idea', 'public');

SET LOCAL role = 'postgres';
SELECT tests.set_claims(NULL);

SELECT is(
  (SELECT visibility FROM public.feedback_items WHERE title = 'Default Visibility Item'),
  'internal',
  'feedback_items inserted without visibility defaults to internal, not public'
);

SELECT is(
  (SELECT visibility FROM public.feedback_items WHERE title = 'Explicit Public Item'),
  'public',
  'feedback_items inserted with an explicit visibility keeps it'
);

SELECT * FROM finish();
ROLLBACK;
