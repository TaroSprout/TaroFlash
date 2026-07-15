-- =============================================================================
-- Feedback board: 20260715000001-000005 migrations
--
--   - can_moderate_feedback() is the first capability fn to diverge from plain
--     is_admin — grants BOTH admin and moderator roles. Assert both roles pass
--     and a plain user is rejected via update_feedback_item.
--   - submit_feedback validates p_title (null / blank raise; valid succeeds).
--   - feedback_items visibility: public items readable by any member,
--     internal items gated behind can_moderate_feedback().
--   - feedback_votes write RLS (20260715000005 regression fix): insert/delete
--     scoped to the caller's own member_id via WITH CHECK / USING.
--   - toggle_feedback_vote is a true toggle (vote → un-vote), and
--     feedback_items_with_votes() joins the submitter's member row (not the
--     caller's) for display_name/avatar, while voted_by_me/vote_count stay
--     scoped per caller.
-- =============================================================================

BEGIN;

SELECT plan(22);

-- ── Setup ─────────────────────────────────────────────────────────────────────

SELECT tests.create_user('a1111111-1111-1111-1111-111111111111'::uuid, 'alice_fb');
SELECT tests.create_user('b2222222-2222-2222-2222-222222222222'::uuid, 'bob_fb');
SELECT tests.create_user('c3333333-3333-3333-3333-333333333333'::uuid, 'carla_fb_admin');
SELECT tests.create_user('d4444444-4444-4444-4444-444444444444'::uuid, 'dave_fb_mod');
SELECT tests.create_user('e5555555-5555-5555-5555-555555555555'::uuid, 'erin_fb');

UPDATE public.members SET role = 'admin'
  WHERE id = 'c3333333-3333-3333-3333-333333333333';
UPDATE public.members SET role = 'moderator'
  WHERE id = 'd4444444-4444-4444-4444-444444444444';
UPDATE public.members SET display_name = 'Alice Display', cover_config = '{"avatar":"alice.png"}'::jsonb
  WHERE id = 'a1111111-1111-1111-1111-111111111111';

-- Fixture feedback items inserted directly as postgres (bypasses RLS) so
-- these fixtures can set visibility explicitly, independent of submit_feedback's
-- defaults.
SET LOCAL role = 'postgres';

SELECT tests.set_claims('a1111111-1111-1111-1111-111111111111'::uuid);
INSERT INTO public.feedback_items (title, body, type, visibility)
VALUES ('Public Item A', 'body a', 'idea', 'public');

INSERT INTO public.feedback_items (title, body, type, visibility)
VALUES ('Toggle Item C', 'body c', 'idea', 'public');

SELECT tests.set_claims('b2222222-2222-2222-2222-222222222222'::uuid);
INSERT INTO public.feedback_items (title, body, type, visibility)
VALUES ('Internal Item B', 'body b', 'bug', 'internal');

-- Alice's fixture vote on Public Item A, inserted directly to seed vote-write
-- RLS tests below without depending on toggle_feedback_vote.
SELECT tests.set_claims('a1111111-1111-1111-1111-111111111111'::uuid);
INSERT INTO public.feedback_votes (feedback_id, member_id)
VALUES (
  (SELECT id FROM public.feedback_items WHERE title = 'Public Item A'),
  'a1111111-1111-1111-1111-111111111111'
);

SELECT tests.set_claims(NULL);


-- ── can_moderate_feedback() EXECUTE privilege lockdown ────────────────────────

-- Test 1: anon cannot execute can_moderate_feedback()
SELECT is(
  has_function_privilege('anon', 'public.can_moderate_feedback()', 'EXECUTE'),
  false,
  'anon cannot execute can_moderate_feedback()'
);

-- Test 2: authenticated can execute can_moderate_feedback()
SELECT is(
  has_function_privilege('authenticated', 'public.can_moderate_feedback()', 'EXECUTE'),
  true,
  'authenticated can execute can_moderate_feedback()'
);


-- ── submit_feedback title validation ──────────────────────────────────────────

SELECT tests.set_claims('a1111111-1111-1111-1111-111111111111'::uuid);
SET LOCAL role = 'authenticated';

-- Test 3: NULL title raises
SELECT throws_ok(
  $$ SELECT public.submit_feedback(NULL, 'body', 'idea') $$,
  'Title is required',
  'submit_feedback raises when p_title is NULL'
);

-- Test 4: blank/whitespace-only title raises
SELECT throws_ok(
  $$ SELECT public.submit_feedback('   ', 'body', 'idea') $$,
  'Title is required',
  'submit_feedback raises when p_title is blank/whitespace-only'
);

-- Test 5: valid title succeeds.
SELECT lives_ok(
  $$ SELECT public.submit_feedback('Valid Title', 'body', 'idea') $$,
  'submit_feedback succeeds for a member submitting their own feedback'
);

SET LOCAL role = 'postgres';
SELECT tests.set_claims(NULL);


-- ── feedback_items visibility RLS ─────────────────────────────────────────────

SELECT tests.set_claims('e5555555-5555-5555-5555-555555555555'::uuid);
SET LOCAL role = 'authenticated';

-- Test 6: plain member can read another member's public item
SELECT is(
  (SELECT count(*)::int FROM public.feedback_items WHERE title = 'Public Item A'),
  1,
  'plain member can read another member''s public feedback item'
);

-- Test 7: plain member cannot read another member's internal item
SELECT is(
  (SELECT count(*)::int FROM public.feedback_items WHERE title = 'Internal Item B'),
  0,
  'plain member cannot read another member''s internal feedback item'
);

SET LOCAL role = 'postgres';
SELECT tests.set_claims('d4444444-4444-4444-4444-444444444444'::uuid);
SET LOCAL role = 'authenticated';

-- Test 8: moderator can read another member's internal item
SELECT is(
  (SELECT count(*)::int FROM public.feedback_items WHERE title = 'Internal Item B'),
  1,
  'moderator (can_moderate_feedback) can read another member''s internal feedback item'
);

SET LOCAL role = 'postgres';
SELECT tests.set_claims('b2222222-2222-2222-2222-222222222222'::uuid);
SET LOCAL role = 'authenticated';

-- Test 8b: a member can read their own internal item (needed so
-- submit_feedback's `RETURNING *` can read back a fresh 'internal' row).
SELECT is(
  (SELECT count(*)::int FROM public.feedback_items WHERE title = 'Internal Item B'),
  1,
  'a member can read their own internal feedback item'
);

SET LOCAL role = 'postgres';
SELECT tests.set_claims(NULL);


-- ── feedback_votes write RLS (regression: INSERT/DELETE policies) ────────────

SELECT tests.set_claims('b2222222-2222-2222-2222-222222222222'::uuid);
SET LOCAL role = 'authenticated';

-- Test 9: member can insert their own feedback vote row
SELECT lives_ok(
  $$
    INSERT INTO public.feedback_votes (feedback_id, member_id)
    VALUES (
      (SELECT id FROM public.feedback_items WHERE title = 'Public Item A'),
      'b2222222-2222-2222-2222-222222222222'
    )
  $$,
  'member can insert their own feedback vote row'
);

-- Test 10: member cannot insert a vote row with someone else's member_id.
-- set_member_id_on_feedback_vote (BEFORE INSERT) always overwrites member_id
-- with auth.uid(), so it must be disabled here to actually exercise the
-- WITH CHECK policy on an explicit foreign member_id (same technique as the
-- seed migration's admin-attributed insert).
SET LOCAL role = 'postgres';
ALTER TABLE public.feedback_votes DISABLE TRIGGER set_member_id_on_feedback_vote;
SELECT tests.set_claims('b2222222-2222-2222-2222-222222222222'::uuid);
SET LOCAL role = 'authenticated';

SELECT throws_ok(
  $$
    INSERT INTO public.feedback_votes (feedback_id, member_id)
    VALUES (
      (SELECT id FROM public.feedback_items WHERE title = 'Public Item A'),
      'c3333333-3333-3333-3333-333333333333'
    )
  $$,
  'new row violates row-level security policy for table "feedback_votes"',
  'member cannot insert a feedback vote row for another member''s id'
);

SET LOCAL role = 'postgres';
ALTER TABLE public.feedback_votes ENABLE TRIGGER set_member_id_on_feedback_vote;
SELECT tests.set_claims('b2222222-2222-2222-2222-222222222222'::uuid);
SET LOCAL role = 'authenticated';

-- Test 11: member can delete their own feedback vote row
SELECT lives_ok(
  $$
    DELETE FROM public.feedback_votes
    WHERE feedback_id = (SELECT id FROM public.feedback_items WHERE title = 'Public Item A')
      AND member_id = 'b2222222-2222-2222-2222-222222222222'
  $$,
  'member can delete their own feedback vote row'
);

-- Test 12: member cannot delete another member's feedback vote row (silent
-- no-op under RLS USING, not an error — assert the row survives).
DELETE FROM public.feedback_votes
WHERE feedback_id = (SELECT id FROM public.feedback_items WHERE title = 'Public Item A')
  AND member_id = 'a1111111-1111-1111-1111-111111111111';

SET LOCAL role = 'postgres';
SELECT is(
  (SELECT count(*)::int FROM public.feedback_votes
    WHERE feedback_id = (SELECT id FROM public.feedback_items WHERE title = 'Public Item A')
      AND member_id = 'a1111111-1111-1111-1111-111111111111'),
  1,
  'member cannot delete another member''s feedback vote row'
);

SELECT tests.set_claims(NULL);


-- ── toggle_feedback_vote is a true toggle ──────────────────────────────────────

SELECT tests.set_claims('e5555555-5555-5555-5555-555555555555'::uuid);
SET LOCAL role = 'authenticated';

-- Test 13: first call inserts a vote and returns true
SELECT is(
  public.toggle_feedback_vote((SELECT id FROM public.feedback_items WHERE title = 'Toggle Item C')),
  true,
  'toggle_feedback_vote returns true on first call (vote inserted)'
);

-- Test 14: vote_count reflects the vote via feedback_items_with_votes()
SELECT is(
  (SELECT vote_count FROM public.feedback_items_with_votes() WHERE title = 'Toggle Item C'),
  1,
  'feedback_items_with_votes vote_count reflects the new vote'
);

-- Test 15: second call removes the vote and returns false
SELECT is(
  public.toggle_feedback_vote((SELECT id FROM public.feedback_items WHERE title = 'Toggle Item C')),
  false,
  'toggle_feedback_vote returns false on second call (vote removed)'
);

-- Test 16: vote_count reflects the un-vote
SELECT is(
  (SELECT vote_count FROM public.feedback_items_with_votes() WHERE title = 'Toggle Item C'),
  0,
  'feedback_items_with_votes vote_count reflects the un-vote'
);

SET LOCAL role = 'postgres';
SELECT tests.set_claims(NULL);


-- ── update_feedback_item: can_moderate_feedback grants admin AND moderator ────

SELECT tests.set_claims('e5555555-5555-5555-5555-555555555555'::uuid);
SET LOCAL role = 'authenticated';

-- Test 17: plain member is rejected with the explicit permission check
SELECT throws_ok(
  $$
    SELECT public.update_feedback_item(
      (SELECT id FROM public.feedback_items WHERE title = 'Public Item A'),
      'accepted', 'public'
    )
  $$,
  'Not permitted',
  'update_feedback_item rejects a plain member with ''Not permitted'''
);

SET LOCAL role = 'postgres';
SELECT tests.set_claims('c3333333-3333-3333-3333-333333333333'::uuid);
SET LOCAL role = 'authenticated';

-- Test 18: admin can update
SELECT lives_ok(
  $$
    SELECT public.update_feedback_item(
      (SELECT id FROM public.feedback_items WHERE title = 'Public Item A'),
      'accepted', 'public'
    )
  $$,
  'admin (can_moderate_feedback) can call update_feedback_item'
);

SET LOCAL role = 'postgres';
SELECT tests.set_claims('d4444444-4444-4444-4444-444444444444'::uuid);
SET LOCAL role = 'authenticated';

-- Test 19: moderator can update
SELECT lives_ok(
  $$
    SELECT public.update_feedback_item(
      (SELECT id FROM public.feedback_items WHERE title = 'Public Item A'),
      'in-progress', 'public'
    )
  $$,
  'moderator (can_moderate_feedback) can call update_feedback_item'
);

SET LOCAL role = 'postgres';
SELECT tests.set_claims(NULL);


-- ── feedback_items_with_votes join correctness ────────────────────────────────

SELECT tests.set_claims('b2222222-2222-2222-2222-222222222222'::uuid);
SET LOCAL role = 'authenticated';

-- Test 20: member_display_name/member_avatar come from the submitter's
-- members row, not the caller's, when the caller reads another member's item.
SELECT results_eq(
  $$
    SELECT member_display_name, member_avatar
    FROM public.feedback_items_with_votes()
    WHERE title = 'Public Item A'
  $$,
  $$ VALUES ('Alice Display'::text, 'alice.png'::text) $$,
  'feedback_items_with_votes joins the submitter''s display_name/avatar, not the caller''s'
);

SET LOCAL role = 'postgres';
SELECT tests.set_claims('a1111111-1111-1111-1111-111111111111'::uuid);
SET LOCAL role = 'authenticated';

-- Test 21: voted_by_me is scoped per caller — true for the voter (alice)
SELECT is(
  (SELECT voted_by_me FROM public.feedback_items_with_votes() WHERE title = 'Public Item A'),
  true,
  'feedback_items_with_votes voted_by_me is true for the caller who voted'
);

SET LOCAL role = 'postgres';
SELECT tests.set_claims(NULL);

SELECT * FROM finish();
ROLLBACK;
