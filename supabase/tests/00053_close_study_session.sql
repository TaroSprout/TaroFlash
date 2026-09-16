-- =============================================================================
-- close_study_session — closes a session and pays a curve session bonus
-- =============================================================================
-- Covers:
--   • a flagged member's session with mixed correct ratings pays
--     round(30 * (1 - 0.98^N)) for N distinct correct final-rated cards
--   • a re-answered card counts once (final rating wins); a card whose final
--     rating is Again (1) is excluded from N
--   • closing the same session twice credits exactly once (occasion-ref
--     idempotency) and leaves closed_at unchanged on the second call
--   • a non-flagged member's session still closes but earns no credit
--   • a session with N = 0 correct cards (here: no review_logs at all)
--     closes with no credit
--   • an unknown session id is a no-op — no exception, nothing written
--   • only the session owner can close/pay it — a non-owner caller leaves
--     the session open and credits nobody
--   • EXECUTE is authenticated/service_role only — anon is revoked
-- =============================================================================

BEGIN;

SELECT plan(25);

-- ── Setup ─────────────────────────────────────────────────────────────────────

SELECT tests.create_user('61616161-6161-6161-6161-616161616161'::uuid, 'flagged_member_00053');
SELECT tests.create_user('62626262-6262-6262-6262-626262626262'::uuid, 'unflagged_member_00053');
SELECT tests.create_user('63636363-6363-6363-6363-636363636363'::uuid, 'other_member_00053');

-- Pin the capability to 'targeted' regardless of its current admin-toggled
-- state, so "flagged" here means "holds a capability_grants row" exactly.
UPDATE public.capabilities SET state = 'targeted' WHERE key = 'session_rewards';

-- Only the first member holds the 'session_rewards' allow-list grant.
INSERT INTO public.capability_grants (key, member_id) VALUES
  ('session_rewards', '61616161-6161-6161-6161-616161616161');

-- decks.member_id is stamped by a trigger off auth.uid(), so the fixture deck
-- is created as an authenticated caller rather than as postgres.
SELECT tests.set_claims('61616161-6161-6161-6161-616161616161'::uuid);
SET LOCAL role = 'authenticated';

INSERT INTO public.decks (id, title, is_public) VALUES (650, 'Session Rewards Deck', false);
INSERT INTO public.cards (id, deck_id, front_text, back_text, rank) VALUES
  (6100, 650, 'Q1', 'A1', 'a0'), (6101, 650, 'Q2', 'A2', 'a1'),
  (6102, 650, 'Q3', 'A3', 'a2'), (6103, 650, 'Q4', 'A4', 'a3'),
  (6104, 650, 'Q5', 'A5', 'a4'), (6105, 650, 'Q6', 'A6', 'a5'),
  (6106, 650, 'Q7', 'A7', 'a6'), (6107, 650, 'Q8', 'A8', 'a7'),
  (6108, 650, 'Q9', 'A9', 'a8'), (6109, 650, 'Q10', 'A10', 'a9'),
  (6110, 650, 'Q11', 'A11', 'b0'), (6111, 650, 'Q12', 'A12', 'b1'),
  (6112, 650, 'Q13', 'A13', 'b2'),
  (6120, 650, 'Q14', 'A14', 'c0'), (6121, 650, 'Q15', 'A15', 'c1'),
  (6122, 650, 'Q16', 'A16', 'c2'),
  (6140, 650, 'Q17', 'A17', 'd0'), (6141, 650, 'Q18', 'A18', 'd1');

SET LOCAL role = 'postgres';

-- S1 (obligation 1): flagged member, 10 distinct correct cards, mixed ratings.
INSERT INTO public.study_sessions (id, member_id) VALUES
  ('aaaa0001-0000-0000-0000-000000000001', '61616161-6161-6161-6161-616161616161');

-- S2 (obligation 2): flagged member, a re-answered card (final wins) plus a
-- card whose final rating is Again.
INSERT INTO public.study_sessions (id, member_id) VALUES
  ('aaaa0002-0000-0000-0000-000000000002', '61616161-6161-6161-6161-616161616161');

-- S4 (obligation 4): non-flagged member, otherwise-correct cards.
INSERT INTO public.study_sessions (id, member_id) VALUES
  ('aaaa0004-0000-0000-0000-000000000004', '62626262-6262-6262-6262-626262626262');

-- S5 (obligation 5): flagged member, no review_logs at all (N = 0).
INSERT INTO public.study_sessions (id, member_id) VALUES
  ('aaaa0005-0000-0000-0000-000000000005', '61616161-6161-6161-6161-616161616161');

-- S7 (obligation 7): owned by the flagged member; a different member will
-- attempt to close it.
INSERT INTO public.study_sessions (id, member_id) VALUES
  ('aaaa0007-0000-0000-0000-000000000007', '61616161-6161-6161-6161-616161616161');

-- S1 fixtures: 10 distinct cards, ratings alternate 2/3/4 (never Again).
INSERT INTO public.review_logs (id, card_id, member_id, rating, state, due, review, session_id) VALUES
  (900100, 6100, '61616161-6161-6161-6161-616161616161', 2, 2, now() + interval '1 day', now() - interval '50 minutes', 'aaaa0001-0000-0000-0000-000000000001'),
  (900101, 6101, '61616161-6161-6161-6161-616161616161', 3, 2, now() + interval '1 day', now() - interval '49 minutes', 'aaaa0001-0000-0000-0000-000000000001'),
  (900102, 6102, '61616161-6161-6161-6161-616161616161', 4, 2, now() + interval '1 day', now() - interval '48 minutes', 'aaaa0001-0000-0000-0000-000000000001'),
  (900103, 6103, '61616161-6161-6161-6161-616161616161', 2, 2, now() + interval '1 day', now() - interval '47 minutes', 'aaaa0001-0000-0000-0000-000000000001'),
  (900104, 6104, '61616161-6161-6161-6161-616161616161', 3, 2, now() + interval '1 day', now() - interval '46 minutes', 'aaaa0001-0000-0000-0000-000000000001'),
  (900105, 6105, '61616161-6161-6161-6161-616161616161', 4, 2, now() + interval '1 day', now() - interval '45 minutes', 'aaaa0001-0000-0000-0000-000000000001'),
  (900106, 6106, '61616161-6161-6161-6161-616161616161', 2, 2, now() + interval '1 day', now() - interval '44 minutes', 'aaaa0001-0000-0000-0000-000000000001'),
  (900107, 6107, '61616161-6161-6161-6161-616161616161', 3, 2, now() + interval '1 day', now() - interval '43 minutes', 'aaaa0001-0000-0000-0000-000000000001'),
  (900108, 6108, '61616161-6161-6161-6161-616161616161', 4, 2, now() + interval '1 day', now() - interval '42 minutes', 'aaaa0001-0000-0000-0000-000000000001'),
  (900109, 6109, '61616161-6161-6161-6161-616161616161', 2, 2, now() + interval '1 day', now() - interval '41 minutes', 'aaaa0001-0000-0000-0000-000000000001');

-- S2 fixtures:
--   6110: earlier rating 3 (correct), later rating 1 (Again) -> final excluded
--   6111: earlier rating 1 (Again), later rating 4 (correct) -> final counted
--   6112: single log, rating 2 (correct) -> counted
INSERT INTO public.review_logs (id, card_id, member_id, rating, state, due, review, session_id) VALUES
  (900110, 6110, '61616161-6161-6161-6161-616161616161', 3, 2, now() + interval '1 day', now() - interval '30 minutes', 'aaaa0002-0000-0000-0000-000000000002'),
  (900111, 6110, '61616161-6161-6161-6161-616161616161', 1, 1, now() + interval '10 minutes', now() - interval '29 minutes', 'aaaa0002-0000-0000-0000-000000000002'),
  (900112, 6111, '61616161-6161-6161-6161-616161616161', 1, 1, now() + interval '10 minutes', now() - interval '28 minutes', 'aaaa0002-0000-0000-0000-000000000002'),
  (900113, 6111, '61616161-6161-6161-6161-616161616161', 4, 2, now() + interval '1 day', now() - interval '27 minutes', 'aaaa0002-0000-0000-0000-000000000002'),
  (900114, 6112, '61616161-6161-6161-6161-616161616161', 2, 2, now() + interval '1 day', now() - interval '26 minutes', 'aaaa0002-0000-0000-0000-000000000002');

-- S4 fixtures: 3 distinct correct cards for a non-flagged member.
INSERT INTO public.review_logs (id, card_id, member_id, rating, state, due, review, session_id) VALUES
  (900120, 6120, '62626262-6262-6262-6262-626262626262', 2, 2, now() + interval '1 day', now() - interval '20 minutes', 'aaaa0004-0000-0000-0000-000000000004'),
  (900121, 6121, '62626262-6262-6262-6262-626262626262', 3, 2, now() + interval '1 day', now() - interval '19 minutes', 'aaaa0004-0000-0000-0000-000000000004'),
  (900122, 6122, '62626262-6262-6262-6262-626262626262', 4, 2, now() + interval '1 day', now() - interval '18 minutes', 'aaaa0004-0000-0000-0000-000000000004');

-- S7 fixtures: 2 distinct correct cards, owned by the flagged member.
INSERT INTO public.review_logs (id, card_id, member_id, rating, state, due, review, session_id) VALUES
  (900140, 6140, '61616161-6161-6161-6161-616161616161', 2, 2, now() + interval '1 day', now() - interval '10 minutes', 'aaaa0007-0000-0000-0000-000000000007'),
  (900141, 6141, '61616161-6161-6161-6161-616161616161', 3, 2, now() + interval '1 day', now() - interval '9 minutes', 'aaaa0007-0000-0000-0000-000000000007');

-- ── Obligation 1: mixed final ratings, N = 10, curve payout ──────────────────

SELECT tests.set_claims('61616161-6161-6161-6161-616161616161'::uuid);
SET LOCAL role = 'authenticated';

-- Test 1: closing a flagged member's session does not raise.
SELECT lives_ok(
  $$ SELECT public.close_study_session('aaaa0001-0000-0000-0000-000000000001'::uuid) $$,
  'closing a flagged member''s session does not raise'
);

SET LOCAL role = 'postgres';

-- Test 2: closed_at is now set.
SELECT isnt(
  (SELECT closed_at FROM public.study_sessions
   WHERE id = 'aaaa0001-0000-0000-0000-000000000001'),
  NULL,
  'closing the session sets closed_at'
);

-- Test 3: the ledger credit equals round(30 * (1 - 0.98^10)) = 5.
SELECT is(
  (SELECT pl.amount
     FROM public.paperclip_ledger pl
     JOIN public.member_rewards mm ON mm.id = pl.member_reward_id
    WHERE mm.member_id = '61616161-6161-6161-6161-616161616161'::uuid
      AND mm.occasion_ref = 'aaaa0001-0000-0000-0000-000000000001'),
  5::bigint,
  'N = 10 distinct correct cards pays round(30 * (1 - 0.98^10)) = 5'
);

-- Snapshot closed_at for the idempotency check below.
CREATE TEMP TABLE _s1_snapshot AS
SELECT closed_at FROM public.study_sessions
WHERE id = 'aaaa0001-0000-0000-0000-000000000001';

-- ── Obligation 2: re-answered card counts once; final Again is excluded ──────

SELECT tests.set_claims('61616161-6161-6161-6161-616161616161'::uuid);
SET LOCAL role = 'authenticated';

-- Test 4: closing the mixed-history session does not raise.
SELECT lives_ok(
  $$ SELECT public.close_study_session('aaaa0002-0000-0000-0000-000000000002'::uuid) $$,
  'closing a session with a re-answered card does not raise'
);

SET LOCAL role = 'postgres';

-- Test 5: N = 2 (6111 final-correct, 6112 correct; 6110 final-Again excluded)
-- pays round(30 * (1 - 0.98^2)) = 1.
SELECT is(
  (SELECT pl.amount
     FROM public.paperclip_ledger pl
     JOIN public.member_rewards mm ON mm.id = pl.member_reward_id
    WHERE mm.member_id = '61616161-6161-6161-6161-616161616161'::uuid
      AND mm.occasion_ref = 'aaaa0002-0000-0000-0000-000000000002'),
  1::bigint,
  'a re-answered card counts once by its final rating, and a final Again is excluded from N'
);

-- ── Obligation 3: closing the same session twice credits once ───────────────

SELECT tests.set_claims('61616161-6161-6161-6161-616161616161'::uuid);
SET LOCAL role = 'authenticated';

-- Test 6: closing the already-closed S1 a second time does not raise.
SELECT lives_ok(
  $$ SELECT public.close_study_session('aaaa0001-0000-0000-0000-000000000001'::uuid) $$,
  'closing an already-closed session a second time does not raise'
);

SET LOCAL role = 'postgres';

-- Test 7: exactly one member_rewards grant row exists for the occasion.
SELECT is(
  (SELECT count(*)::int FROM public.member_rewards
    WHERE member_id = '61616161-6161-6161-6161-616161616161'::uuid
      AND occasion_ref = 'aaaa0001-0000-0000-0000-000000000001'),
  1,
  'exactly one member_rewards grant row exists after closing the session twice'
);

-- Test 8: exactly one ledger row exists for the occasion.
SELECT is(
  (SELECT count(*)::int
     FROM public.paperclip_ledger pl
     JOIN public.member_rewards mm ON mm.id = pl.member_reward_id
    WHERE mm.member_id = '61616161-6161-6161-6161-616161616161'::uuid
      AND mm.occasion_ref = 'aaaa0001-0000-0000-0000-000000000001'),
  1,
  'exactly one ledger row exists after closing the session twice'
);

-- Test 9: closed_at is unchanged by the second call.
SELECT is(
  (SELECT closed_at FROM public.study_sessions
   WHERE id = 'aaaa0001-0000-0000-0000-000000000001'),
  (SELECT closed_at FROM _s1_snapshot),
  'closed_at does not change on the second close'
);

-- ── Obligation 4: non-flagged member closes but earns no credit ─────────────

SELECT tests.set_claims('62626262-6262-6262-6262-626262626262'::uuid);
SET LOCAL role = 'authenticated';

-- Test 10: closing a non-flagged member's session does not raise.
SELECT lives_ok(
  $$ SELECT public.close_study_session('aaaa0004-0000-0000-0000-000000000004'::uuid) $$,
  'closing a non-flagged member''s session does not raise'
);

SET LOCAL role = 'postgres';

-- Test 11: closed_at is set even without the capability.
SELECT isnt(
  (SELECT closed_at FROM public.study_sessions
   WHERE id = 'aaaa0004-0000-0000-0000-000000000004'),
  NULL,
  'a non-flagged member''s session still closes'
);

-- Test 12: no member_rewards grant row was written.
SELECT is_empty(
  $$
    SELECT 1 FROM public.member_rewards
     WHERE member_id = '62626262-6262-6262-6262-626262626262'::uuid
       AND occasion_ref = 'aaaa0004-0000-0000-0000-000000000004'
  $$,
  'a non-flagged member earns no member_rewards grant row'
);

-- Test 13: no ledger row was written.
SELECT is_empty(
  $$
    SELECT 1
      FROM public.paperclip_ledger pl
      JOIN public.member_rewards mm ON mm.id = pl.member_reward_id
     WHERE mm.member_id = '62626262-6262-6262-6262-626262626262'::uuid
       AND mm.occasion_ref = 'aaaa0004-0000-0000-0000-000000000004'
  $$,
  'a non-flagged member earns no ledger row'
);

-- ── Obligation 5: N = 0 (no review_logs) closes with no credit ──────────────

SELECT tests.set_claims('61616161-6161-6161-6161-616161616161'::uuid);
SET LOCAL role = 'authenticated';

-- Test 14: closing a session with no review_logs does not raise.
SELECT lives_ok(
  $$ SELECT public.close_study_session('aaaa0005-0000-0000-0000-000000000005'::uuid) $$,
  'closing a session with no review_logs does not raise'
);

SET LOCAL role = 'postgres';

-- Test 15: closed_at is set.
SELECT isnt(
  (SELECT closed_at FROM public.study_sessions
   WHERE id = 'aaaa0005-0000-0000-0000-000000000005'),
  NULL,
  'a session with no review_logs still closes'
);

-- Test 16: no member_rewards grant row was written for it.
SELECT is_empty(
  $$
    SELECT 1 FROM public.member_rewards
     WHERE occasion_ref = 'aaaa0005-0000-0000-0000-000000000005'
  $$,
  'N = 0 writes no member_rewards grant row'
);

-- ── Obligation 6: unknown session id is a no-op ──────────────────────────────

SELECT tests.set_claims('61616161-6161-6161-6161-616161616161'::uuid);
SET LOCAL role = 'authenticated';

-- Test 17: closing an unknown session id does not raise.
SELECT lives_ok(
  $$ SELECT public.close_study_session('aaaa0006-0000-0000-0000-000000000006'::uuid) $$,
  'closing an unknown session id does not raise'
);

SET LOCAL role = 'postgres';

-- Test 18: no study_sessions row was created for it.
SELECT is_empty(
  $$
    SELECT 1 FROM public.study_sessions
     WHERE id = 'aaaa0006-0000-0000-0000-000000000006'
  $$,
  'closing an unknown session id creates no study_sessions row'
);

-- Test 19: no member_rewards grant row was written for it.
SELECT is_empty(
  $$
    SELECT 1 FROM public.member_rewards
     WHERE occasion_ref = 'aaaa0006-0000-0000-0000-000000000006'
  $$,
  'closing an unknown session id credits nothing'
);

-- ── Obligation 7: only the owner can close/pay a session ────────────────────

SELECT tests.set_claims('63636363-6363-6363-6363-636363636363'::uuid);
SET LOCAL role = 'authenticated';

-- Test 20: a non-owner closing another member's session does not raise.
SELECT lives_ok(
  $$ SELECT public.close_study_session('aaaa0007-0000-0000-0000-000000000007'::uuid) $$,
  'a non-owner closing another member''s session does not raise'
);

SET LOCAL role = 'postgres';

-- Test 21: the session's closed_at stays NULL.
SELECT is(
  (SELECT closed_at FROM public.study_sessions
   WHERE id = 'aaaa0007-0000-0000-0000-000000000007'),
  NULL,
  'a non-owner call leaves the owner''s session unclosed'
);

-- Test 22: no member_rewards grant row was written for anyone.
SELECT is_empty(
  $$
    SELECT 1 FROM public.member_rewards
     WHERE occasion_ref = 'aaaa0007-0000-0000-0000-000000000007'
  $$,
  'a non-owner call credits nobody'
);

-- ── EXECUTE grants ────────────────────────────────────────────────────────────

-- Test 23: authenticated can execute close_study_session().
SELECT is(
  has_function_privilege('authenticated', 'public.close_study_session(uuid)', 'EXECUTE'),
  true,
  'authenticated can execute close_study_session()'
);

-- Test 24: service_role can execute close_study_session().
SELECT is(
  has_function_privilege('service_role', 'public.close_study_session(uuid)', 'EXECUTE'),
  true,
  'service_role can execute close_study_session()'
);

-- Test 25: anon cannot execute close_study_session().
SELECT is(
  has_function_privilege('anon', 'public.close_study_session(uuid)', 'EXECUTE'),
  false,
  'anon cannot execute close_study_session()'
);

SELECT * FROM finish();
ROLLBACK;
