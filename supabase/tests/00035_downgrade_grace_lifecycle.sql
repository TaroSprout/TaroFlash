-- =============================================================================
-- begin_downgrade_grace() / clear_downgrade_grace() lifecycle
--
-- The free-downgrade analog of begin_account_deletion()/restore_account():
--   * begin_downgrade_grace() stamps a ~15-day deadline only when the member
--     is over their plan's deck_limit; idempotent (a re-fired webhook can't
--     slide the window).
--   * A member at-or-under the limit gets no deadline at all.
--   * clear_downgrade_grace() clears the deadline, which unlocks every deck
--     at once (locking is derived, nothing per-deck to unwind).
--   * The members self-update policy freezes downgrade_delete_at: a member
--     can neither set it nor clear it via a direct UPDATE.
-- =============================================================================

BEGIN;

SELECT plan(10);

-- ── Setup (as postgres superuser) ─────────────────────────────────────────────

SELECT tests.create_user('e0000000-0000-0000-0000-00000000a001'::uuid, 'grace_alice');
SELECT tests.create_user('e0000000-0000-0000-0000-00000000b001'::uuid, 'grace_bob');

-- Alice: 11 decks, one over the free deck_limit of 10. Explicit ids bypass
-- enforce_member_deck_limit (it only checks inserts with no id assigned).
-- member_id is NOT settable directly — set_member_id_on_deck always overwrites
-- it from auth.uid(), so the insert must run as Alice herself.
SELECT tests.set_claims('e0000000-0000-0000-0000-00000000a001'::uuid);
SET LOCAL role = 'authenticated';

INSERT INTO public.decks (id, title, is_public) VALUES
  (9000, 'Alice deck 1',  false),
  (9001, 'Alice deck 2',  false),
  (9002, 'Alice deck 3',  false),
  (9003, 'Alice deck 4',  false),
  (9004, 'Alice deck 5',  false),
  (9005, 'Alice deck 6',  false),
  (9006, 'Alice deck 7',  false),
  (9007, 'Alice deck 8',  false),
  (9008, 'Alice deck 9',  false),
  (9009, 'Alice deck 10', false),
  (9010, 'Alice deck 11', false);

SET LOCAL role = 'postgres';

-- Bob: exactly at the free deck_limit of 10 — never over it.
SELECT tests.set_claims('e0000000-0000-0000-0000-00000000b001'::uuid);
SET LOCAL role = 'authenticated';

INSERT INTO public.decks (id, title, is_public) VALUES
  (9100, 'Bob deck 1',  false),
  (9101, 'Bob deck 2',  false),
  (9102, 'Bob deck 3',  false),
  (9103, 'Bob deck 4',  false),
  (9104, 'Bob deck 5',  false),
  (9105, 'Bob deck 6',  false),
  (9106, 'Bob deck 7',  false),
  (9107, 'Bob deck 8',  false),
  (9108, 'Bob deck 9',  false),
  (9109, 'Bob deck 10', false);

SET LOCAL role = 'postgres';
SELECT tests.set_claims(NULL);


-- ── begin_downgrade_grace: over the limit locks [obligation] ─────────────────

-- Test 1: an over-limit free member gets a deadline ~15 days out.
SELECT ok(
  (SELECT public.begin_downgrade_grace('e0000000-0000-0000-0000-00000000a001'::uuid))
    - now() BETWEEN interval '14 days 23 hours' AND interval '15 days 1 hour',
  'begin_downgrade_grace() stamps a deadline ~15 days out for an over-limit free member [obligation]'
);

-- Test 2: the deadline is actually persisted on the member row.
SELECT isnt(
  (SELECT downgrade_delete_at FROM public.members WHERE id = 'e0000000-0000-0000-0000-00000000a001'),
  NULL::timestamptz,
  'begin_downgrade_grace() persists the deadline on members.downgrade_delete_at'
);


-- ── begin_downgrade_grace: at-or-under the limit does not lock [obligation] ──

-- Test 3: a member with exactly deck_limit decks gets no deadline.
SELECT is(
  (SELECT public.begin_downgrade_grace('e0000000-0000-0000-0000-00000000b001'::uuid)),
  NULL::timestamptz,
  'begin_downgrade_grace() returns NULL for a member at (not over) the deck_limit [obligation]'
);

-- Test 4: nothing was stamped for Bob.
SELECT is(
  (SELECT downgrade_delete_at FROM public.members WHERE id = 'e0000000-0000-0000-0000-00000000b001'),
  NULL::timestamptz,
  'begin_downgrade_grace() stamps nothing for a member at the deck_limit [obligation]'
);


-- ── begin_downgrade_grace: idempotent [obligation] ────────────────────────────

-- Test 5: a second call returns the already-stored deadline, not a new one.
SELECT is(
  (SELECT public.begin_downgrade_grace('e0000000-0000-0000-0000-00000000a001'::uuid)),
  (SELECT downgrade_delete_at FROM public.members WHERE id = 'e0000000-0000-0000-0000-00000000a001'),
  'begin_downgrade_grace() is idempotent — a second call does not slide the deadline [obligation]'
);


-- ── clear_downgrade_grace: resubscribe unlocks [obligation] ──────────────────

SELECT public.clear_downgrade_grace('e0000000-0000-0000-0000-00000000a001'::uuid);

-- Test 6: the deadline is cleared.
SELECT is(
  (SELECT downgrade_delete_at FROM public.members WHERE id = 'e0000000-0000-0000-0000-00000000a001'),
  NULL::timestamptz,
  'clear_downgrade_grace() clears downgrade_delete_at [obligation]'
);

-- Test 7: every one of the member's decks reads as unlocked afterwards.
SELECT is(
  (
    SELECT count(*)::int
    FROM public.decks
    WHERE member_id = 'e0000000-0000-0000-0000-00000000a001'
      AND public.deck_lock_deadline(id) IS NOT NULL
  ),
  0,
  'clear_downgrade_grace() unlocks every one of the member''s decks [obligation]'
);


-- ── Security: members self-update policy freezes downgrade_delete_at [obligation] ──

-- Re-stamp a known deadline directly (bypassing RLS, as postgres) so the
-- freeze tests below have a concrete value to try to tamper with.
UPDATE public.members
SET downgrade_delete_at = now() + interval '15 days'
WHERE id = 'e0000000-0000-0000-0000-00000000a001';

SELECT tests.set_claims('e0000000-0000-0000-0000-00000000a001'::uuid);
SET LOCAL role = 'authenticated';

-- Test 8: Alice cannot set/extend her own downgrade_delete_at.
SELECT throws_ok(
  $$
    UPDATE public.members
    SET downgrade_delete_at = now() + interval '99 days'
    WHERE id = 'e0000000-0000-0000-0000-00000000a001'
  $$,
  NULL,
  NULL,
  'Alice cannot set/extend her own downgrade_delete_at via a direct update [obligation]'
);

-- Test 9: Alice cannot clear her own downgrade_delete_at (self-unlock).
SELECT throws_ok(
  $$
    UPDATE public.members
    SET downgrade_delete_at = NULL
    WHERE id = 'e0000000-0000-0000-0000-00000000a001'
  $$,
  NULL,
  NULL,
  'Alice cannot clear her own downgrade_delete_at via a direct update [obligation]'
);

SET LOCAL role = 'postgres';

-- Test 10: the frozen column is genuinely untouched by either failed write.
SELECT ok(
  (SELECT downgrade_delete_at FROM public.members WHERE id = 'e0000000-0000-0000-0000-00000000a001')
    BETWEEN now() + interval '14 days 23 hours' AND now() + interval '15 days 1 hour',
  'downgrade_delete_at is unchanged after both rejected self-writes'
);

SELECT * FROM finish();
ROLLBACK;
