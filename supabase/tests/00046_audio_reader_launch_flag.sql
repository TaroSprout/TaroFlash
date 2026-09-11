BEGIN;

SELECT plan(3);

SELECT is(
  (SELECT state::text FROM public.capabilities WHERE key = 'audio_reader'),
  'off',
  'the audio_reader capability is seeded off'
);

SELECT tests.create_user('44444444-4444-4444-4444-444444444444'::uuid, 'ada_audio_admin');
UPDATE public.members SET role = 'admin'
  WHERE id = '44444444-4444-4444-4444-444444444444';

SELECT tests.set_claims('44444444-4444-4444-4444-444444444444'::uuid);
SET LOCAL role = 'authenticated';

SELECT is(
  public.can_read_lesson_audio(),
  false,
  'can_read_lesson_audio() returns false for an admin when audio_reader is off'
);

SET LOCAL role = 'postgres';
UPDATE public.capabilities SET state = 'on' WHERE key = 'audio_reader';
SELECT tests.set_claims('44444444-4444-4444-4444-444444444444'::uuid);
SET LOCAL role = 'authenticated';

SELECT is(
  public.can_read_lesson_audio(),
  true,
  'can_read_lesson_audio() returns true for an admin when audio_reader is on'
);

SET LOCAL role = 'postgres';
SELECT tests.set_claims(NULL);

SELECT * FROM finish();
ROLLBACK;
