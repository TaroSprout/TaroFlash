-- =============================================================================
-- restore_account() idempotency
--
-- Guards the three branches restore_account() must handle:
--   * not pending — returns NULL rather than raising. Previously raised
--     SQLSTATE 22023, which trapped the member in a non-dismissable panel: the
--     notice's onRecover swallows the failure into an error toast, so a member
--     who was already restored (or never pending) got stuck.
--   * pending, still within the grace window — returns the deadline.
--   * pending, past the deadline — still raises 'Grace period expired'; the
--     purge job may be mid-sweep and resurrecting the account would race it.
-- =============================================================================

BEGIN;

SELECT plan(4);

SELECT tests.create_user('dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, 'restore_user');
SELECT tests.set_claims('dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid);
SET LOCAL role = 'authenticated';

-- ── Branch 1: not pending — returns NULL, does not raise [obligation] ────────

SELECT is(
  (SELECT public.restore_account()),
  NULL::timestamptz,
  'restore_account() returns NULL (not an exception) when the account is not pending'
);

-- ── Branch 2: pending, within the grace window — returns the deadline ───────

SET LOCAL role = 'postgres';
UPDATE public.members
SET delete_at = now() + interval '30 days'
WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
SELECT tests.set_claims('dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid);
SET LOCAL role = 'authenticated';

SELECT isnt(
  (SELECT public.restore_account()),
  NULL::timestamptz,
  'restore_account() returns the deadline when the account is pending and within the grace window'
);

SELECT is(
  (SELECT delete_at FROM public.members WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  NULL::timestamptz,
  'delete_at is cleared after a successful restore'
);

-- ── Branch 3: pending, past the deadline — still raises [obligation] ─────────

SET LOCAL role = 'postgres';
UPDATE public.members
SET delete_at = now() - interval '1 hour'
WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
SELECT tests.set_claims('dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid);
SET LOCAL role = 'authenticated';

SELECT throws_ok(
  $$ SELECT public.restore_account() $$,
  NULL,
  'Grace period expired',
  'restore_account() still raises once the grace period has expired'
);

SELECT * FROM finish();
ROLLBACK;
