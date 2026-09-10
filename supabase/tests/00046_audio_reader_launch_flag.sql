-- =============================================================================
-- Audio reader launch flag introduced in 20260910174715_audio_reader_launch_flag.sql
--
--   - can_read_lesson_audio() composes capability_is_live('audio_reader') with
--     the existing admin check — an admin only reads true once the switch is on.
--   - The migration seeds the audio_reader row at 'off', so a fresh environment
--     stays dark until an admin flips it.
-- =============================================================================

BEGIN;

SELECT plan(3);

-- ── the migration's own seed ──────────────────────────────────────────────────

-- Test 1: the audio_reader switch is seeded at 'off'.
SELECT is(
  (SELECT state::text FROM public.capabilities WHERE key = 'audio_reader'),
  'off',
  'the audio_reader switch is seeded off'
);

-- ── can_read_lesson_audio() rides the switch on top of the admin check ────────

SELECT tests.create_user('44444444-4444-4444-4444-444444444444'::uuid, 'ada_audio_admin');
UPDATE public.members SET role = 'admin'
  WHERE id = '44444444-4444-4444-4444-444444444444';

SELECT tests.set_claims('44444444-4444-4444-4444-444444444444'::uuid);
SET LOCAL role = 'authenticated';

-- Test 2: an admin reads false while the switch is off (the seeded baseline).
SELECT is(
  public.can_read_lesson_audio(),
  false,
  'can_read_lesson_audio() returns false for an admin when audio_reader is off'
);

SET LOCAL role = 'postgres';
UPDATE public.capabilities SET state = 'on' WHERE key = 'audio_reader';
SELECT tests.set_claims('44444444-4444-4444-4444-444444444444'::uuid);
SET LOCAL role = 'authenticated';

-- Test 3: the same admin reads true once the switch is flipped on.
SELECT is(
  public.can_read_lesson_audio(),
  true,
  'can_read_lesson_audio() returns true for an admin when audio_reader is on'
);

SET LOCAL role = 'postgres';
SELECT tests.set_claims(NULL);

SELECT * FROM finish();
ROLLBACK;
