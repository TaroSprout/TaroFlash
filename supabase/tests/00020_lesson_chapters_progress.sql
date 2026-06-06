-- =============================================================================
-- Lesson chapters + progress bookmark
--
-- Covers the 20260606000000 migration:
--   * create_pending_lesson stamps position = max(position)+1, per collection
--   * lesson_collections.last_lesson_id is owner-writable and cross-member-safe
--   * ON DELETE SET NULL clears the bookmark without deleting the collection
--   * the _with_counts view exposes last_lesson_id
-- =============================================================================

BEGIN;

SELECT plan(9);

-- ── Setup ─────────────────────────────────────────────────────────────────────

SELECT tests.create_user('11111111-1111-1111-1111-111111111111'::uuid, 'alice_chapters');
SELECT tests.create_user('22222222-2222-2222-2222-222222222222'::uuid, 'bob_chapters');

-- Alice: collection 10 holds an existing chapter (position 5) for the bookmark +
-- max+1 tests; collection 11 starts empty for the "first chapter" tests.
SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
INSERT INTO public.lesson_collections (id, title) VALUES (10, 'Alice Book 1'), (11, 'Alice Book 2');
INSERT INTO public.lessons (id, collection_id, title, audio_path, "position") VALUES
  (100, 10, 'Alice Ch5', '11111111-1111-1111-1111-111111111111/a5.mp3', 5);

SELECT tests.set_claims('22222222-2222-2222-2222-222222222222'::uuid);
INSERT INTO public.lesson_collections (id, title) VALUES (20, 'Bob Book');


-- ── Position assignment (act as Alice) ─────────────────────────────────────────
SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
SET LOCAL role = 'authenticated';

-- Test 1: first chapter in an empty collection gets position 1
SELECT is(
  (public.create_pending_lesson(11, 'B2 Ch1', '11111111-1111-1111-1111-111111111111/b1.mp3'))."position",
  1::numeric,
  'first lesson in a collection gets position 1'
);

-- Test 2: next chapter gets max(position)+1
SELECT is(
  (public.create_pending_lesson(11, 'B2 Ch2', '11111111-1111-1111-1111-111111111111/b2.mp3'))."position",
  2::numeric,
  'next lesson gets max(position)+1'
);

-- Test 3: position is per-collection — collection 10 already has a position-5
-- chapter, so its next is 6, independent of collection 11's counter
SELECT is(
  (public.create_pending_lesson(10, 'B1 next', '11111111-1111-1111-1111-111111111111/a6.mp3'))."position",
  6::numeric,
  'position is computed per collection (max+1), not globally'
);


-- ── Progress bookmark (act as Alice) ───────────────────────────────────────────

-- Test 4: owner can write last_lesson_id (no RPC — owner-update RLS covers it)
SELECT lives_ok(
  $$ UPDATE public.lesson_collections SET last_lesson_id = 100 WHERE id = 10 $$,
  'owner can set the progress bookmark'
);

-- Test 5: the bookmark persisted
SET LOCAL role = 'postgres';
SELECT is(
  (SELECT last_lesson_id FROM public.lesson_collections WHERE id = 10),
  100::bigint,
  'bookmark persisted on the collection'
);


-- ── Cross-member safety (act as Bob) ───────────────────────────────────────────
SELECT tests.set_claims('22222222-2222-2222-2222-222222222222'::uuid);
SET LOCAL role = 'authenticated';

-- Bob's update matches 0 rows (RLS owner filter), so Alice's bookmark is untouched
UPDATE public.lesson_collections SET last_lesson_id = NULL WHERE id = 10;

-- Test 6: Bob cannot clear Alice's bookmark
SET LOCAL role = 'postgres';
SELECT is(
  (SELECT last_lesson_id FROM public.lesson_collections WHERE id = 10),
  100::bigint,
  'another member cannot change the bookmark'
);


-- ── ON DELETE SET NULL (act as Alice) ──────────────────────────────────────────
SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
SET LOCAL role = 'authenticated';

DELETE FROM public.lessons WHERE id = 100;

-- Test 7: deleting the bookmarked chapter nulls the bookmark
SET LOCAL role = 'postgres';
SELECT is(
  (SELECT last_lesson_id FROM public.lesson_collections WHERE id = 10),
  NULL::bigint,
  'deleting the bookmarked lesson clears last_lesson_id'
);

-- Test 8: the collection survives the chapter delete (set null, not cascade)
SELECT is(
  (SELECT count(*) FROM public.lesson_collections WHERE id = 10)::int,
  1,
  'collection survives deleting its bookmarked lesson'
);


-- ── View exposes last_lesson_id (act as Alice) ─────────────────────────────────
SELECT tests.set_claims('11111111-1111-1111-1111-111111111111'::uuid);
SET LOCAL role = 'authenticated';

INSERT INTO public.lessons (id, collection_id, title, audio_path, "position") VALUES
  (101, 10, 'Alice Ch7', '11111111-1111-1111-1111-111111111111/a7.mp3', 7);
UPDATE public.lesson_collections SET last_lesson_id = 101 WHERE id = 10;

-- Test 9: the counts view surfaces last_lesson_id (security_invoker, owner reads)
SELECT is(
  (SELECT last_lesson_id FROM public.lesson_collections_with_counts WHERE id = 10),
  101::bigint,
  'lesson_collections_with_counts exposes last_lesson_id'
);


SELECT * FROM finish();
ROLLBACK;
