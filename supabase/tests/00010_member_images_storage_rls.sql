-- =============================================================================
-- RLS tests: storage.objects policies for the `member-images` bucket
--
-- Enforces per-member isolation via auth.uid()::text = foldername[1]. Paths are
-- content-addressed (`<member_id>/<sha256>.<ext>`), so only the first segment —
-- the owner's member_id — is policy-relevant. The SELECT policy is required
-- even on pure INSERTs because supabase-js's upload-with-upsert flow emits
-- INSERT ... ON CONFLICT DO UPDATE, which needs SELECT privilege for the
-- conflict-check step.
-- =============================================================================

BEGIN;

SELECT plan(5);

-- ── Setup ─────────────────────────────────────────────────────────────────────

SELECT tests.create_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'alice_storage');
SELECT tests.create_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'bob_storage');


-- ── Act as Alice ──────────────────────────────────────────────────────────────
SELECT tests.set_claims('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid);
SET LOCAL role = 'authenticated';

-- Test 1: Alice can INSERT into her own folder.
SELECT lives_ok(
  $$
    INSERT INTO storage.objects (bucket_id, name, owner, owner_id)
    VALUES (
      'member-images',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/abc123.png',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    )
  $$,
  'Alice can INSERT into her own member-scoped folder'
);

-- Test 2: Alice cannot INSERT into Bob's folder (owner::text ≠ foldername[1]).
SELECT throws_ok(
  $$
    INSERT INTO storage.objects (bucket_id, name, owner, owner_id)
    VALUES (
      'member-images',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/hack.png',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    )
  $$,
  '42501',
  NULL,
  'Alice cannot INSERT into Bob''s folder — policy rejects mismatched owner/path'
);

-- Test 3: UPSERT (INSERT ... ON CONFLICT DO UPDATE) succeeds for Alice's own
-- row. This is the shape supabase-js emits when upload({ upsert: true }) is
-- called — and content-addressing makes it the common path, since re-uploading
-- identical bytes resolves to the same name. Without the SELECT policy this
-- would fail even with no conflicting row, because Postgres needs SELECT for
-- the conflict check.
SELECT lives_ok(
  $$
    INSERT INTO storage.objects (bucket_id, name, owner, owner_id, version)
    VALUES (
      'member-images',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/abc123.png',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'v2'
    )
    ON CONFLICT (name, bucket_id) DO UPDATE SET version = EXCLUDED.version
  $$,
  'UPSERT into Alice''s own folder succeeds (SELECT policy permits conflict check)'
);


-- ── Act as Bob — confirm cross-member isolation ──────────────────────────────
SET LOCAL role = 'postgres';
SELECT tests.set_claims('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid);
SET LOCAL role = 'authenticated';

-- Test 4: Bob does not see Alice's object via storage.objects SELECT.
-- (Public-URL fetches bypass RLS; that path is unaffected. This covers the
-- programmatic SELECT path used by list()/download()/upsert-conflict-check.)
SELECT is(
  (SELECT count(*) FROM storage.objects
   WHERE name = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/abc123.png'
     AND bucket_id = 'member-images')::int,
  0,
  'Bob cannot SELECT Alice''s object through storage.objects RLS'
);

-- Test 5: Bob cannot UPDATE a row in Alice's folder.
UPDATE storage.objects
SET version = 'hacked'
WHERE name = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/abc123.png'
  AND bucket_id = 'member-images';

SET LOCAL role = 'postgres';
SELECT isnt(
  (SELECT version FROM storage.objects
   WHERE name = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/abc123.png'
     AND bucket_id = 'member-images'),
  'hacked',
  'Bob cannot UPDATE rows in Alice''s folder'
);

-- Direct DELETE against storage.objects is globally blocked by Supabase's
-- `storage.protect_delete` trigger regardless of RLS, so DELETE policy
-- enforcement has to be verified at the integration layer (manual upload
-- replacement test), not in pgTAP.


SELECT * FROM finish();
ROLLBACK;
