-- =============================================================================
-- RLS tests: lessons table
--
-- Lessons are strictly owner-only for every operation — no public sharing.
-- The set_member_id trigger stamps member_id from auth.uid() on insert.
-- =============================================================================

BEGIN;

SELECT plan(11);

-- ── Setup ─────────────────────────────────────────────────────────────────────

SELECT tests.create_user('11111111-1111-1111-1111-111111111111'::uuid, 'alice_lessons');
SELECT tests.create_user('22222222-2222-2222-2222-222222222222'::uuid, 'bob_lessons');

-- Insert lessons with claims set so the set_member_id trigger resolves auth.uid().
SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
INSERT INTO public.lessons (id, title, audio_path) VALUES
  (100, 'Alice Lesson', '11111111-1111-1111-1111-111111111111/a.mp3');

SELECT tests.set_claims('22222222-2222-2222-2222-222222222222'::uuid);
INSERT INTO public.lessons (id, title, audio_path) VALUES
  (200, 'Bob Lesson', '22222222-2222-2222-2222-222222222222/b.mp3');


-- ── Act as Alice ──────────────────────────────────────────────────────────────
SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
SET LOCAL role = 'authenticated';

-- Test 1: Alice sees only her own lesson
SELECT is(
  (SELECT count(*) FROM public.lessons WHERE id IN (100, 200))::int,
  1,
  'Alice sees her own lesson but not Bob''s'
);


-- ── Act as Bob ────────────────────────────────────────────────────────────────
SET LOCAL role = 'postgres';
SELECT tests.set_claims('22222222-2222-2222-2222-222222222222'::uuid);
SET LOCAL role = 'authenticated';

-- Test 2: Bob cannot see Alice's lesson by ID
SELECT is(
  (SELECT count(*) FROM public.lessons WHERE id = 100)::int,
  0,
  'Bob cannot see Alice''s lesson'
);

-- Test 3: Bob can create a lesson
SELECT lives_ok(
  $$
    INSERT INTO public.lessons (id, title, audio_path)
    VALUES (201, 'Bob New Lesson', '22222222-2222-2222-2222-222222222222/c.mp3')
  $$,
  'Bob can create a lesson'
);

-- Test 4: Trigger corrects member_id even if client sends a different value
INSERT INTO public.lessons (id, title, audio_path, member_id)
VALUES (999, 'Sneaky Lesson', 'x/d.mp3', '11111111-1111-1111-1111-111111111111');

SET LOCAL role = 'postgres';
SELECT is(
  (SELECT member_id FROM public.lessons WHERE id = 999),
  '22222222-2222-2222-2222-222222222222'::uuid,
  'set_member_id trigger corrects member_id to auth.uid()'
);

-- Test 5: Bob can update his own lesson
SELECT tests.set_claims('22222222-2222-2222-2222-222222222222'::uuid);
SET LOCAL role = 'authenticated';

SELECT lives_ok(
  $$
    UPDATE public.lessons SET title = 'Bob Updated Lesson' WHERE id = 200
  $$,
  'Bob can update his own lesson'
);

-- Test 6: Bob cannot update Alice's lesson
UPDATE public.lessons SET title = 'Hacked' WHERE id = 100;

SET LOCAL role = 'postgres';
SELECT isnt(
  (SELECT title FROM public.lessons WHERE id = 100),
  'Hacked',
  'Bob cannot update Alice''s lesson'
);

-- Test 7: Bob can delete his own lesson
SELECT tests.set_claims('22222222-2222-2222-2222-222222222222'::uuid);
SET LOCAL role = 'authenticated';

SELECT lives_ok(
  $$
    DELETE FROM public.lessons WHERE id = 201
  $$,
  'Bob can delete his own lesson'
);

-- Test 8: Bob cannot delete Alice's lesson
DELETE FROM public.lessons WHERE id = 100;

SET LOCAL role = 'postgres';
SELECT is(
  (SELECT count(*) FROM public.lessons WHERE id = 100)::int,
  1,
  'Alice''s lesson still exists after Bob tried to delete it'
);


-- ── create_lesson RPC + lesson-delete media trigger ────────────────────────────
SELECT tests.set_claims('22222222-2222-2222-2222-222222222222'::uuid);
SET LOCAL role = 'authenticated';

-- Test 9: create_lesson runs for the owner (lesson + media insert in one txn)
SELECT lives_ok(
  $$
    SELECT public.create_lesson(
      'Bob RPC Lesson',
      '22222222-2222-2222-2222-222222222222/rpc.mp3',
      '{"text":"hi","segments":[]}'::jsonb,
      'zh'
    )
  $$,
  'create_lesson RPC runs for the owner'
);

-- Test 10: it also inserts a live audio media row linked to the lesson
SET LOCAL role = 'postgres';
SELECT is(
  (SELECT count(*) FROM public.media
   WHERE bucket = 'audio-lessons'
     AND path = '22222222-2222-2222-2222-222222222222/rpc.mp3'
     AND lesson_id IS NOT NULL
     AND deleted_at IS NULL)::int,
  1,
  'create_lesson inserts a live audio media row linked to the lesson'
);

-- Test 11: deleting the lesson soft-deletes its media row and nulls lesson_id
SELECT tests.set_claims('22222222-2222-2222-2222-222222222222'::uuid);
SET LOCAL role = 'authenticated';
DELETE FROM public.lessons WHERE audio_path = '22222222-2222-2222-2222-222222222222/rpc.mp3';

SET LOCAL role = 'postgres';
SELECT is(
  (SELECT count(*) FROM public.media
   WHERE path = '22222222-2222-2222-2222-222222222222/rpc.mp3'
     AND deleted_at IS NOT NULL
     AND lesson_id IS NULL)::int,
  1,
  'deleting a lesson soft-deletes its audio media row and nulls lesson_id'
);


SELECT * FROM finish();
ROLLBACK;
