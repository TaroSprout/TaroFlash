-- =============================================================================
-- close_study_session — closes a session, pays a per-card session reward, and
-- reads back whole-clip base/bonus/balance
-- =============================================================================
-- Covers:
--   • a flagged member's session with mixed final ratings pays
--     round(0.2 * 1000 * N) session_base thousandths for N distinct correct
--     final-rated cards; a re-answered card counts once (final wins) and a
--     final Again (1) is excluded from N
--   • base is the cross-session cumulative-floor delta: a session whose own
--     base is a sub-clip remainder returns base 0, and a later session that
--     combines with that remainder to cross a whole clip returns base 1
--   • bonus is floor(this session's bonus thousandths / 1000): a
--     difficulty-heavy session that clears a whole clip in one session
--     returns bonus 1, and a session under the threshold returns bonus 0 and
--     writes no session_bonus ledger row
--   • base + bonus reconciles to the whole-clip jump in the member's balance
--     across the session
--   • closing the same session twice credits exactly once and leaves
--     closed_at unchanged on the second call
--   • a non-flagged member's session still closes but earns no credit
--   • a session with N = 0 correct cards closes with no credit
--   • an unknown session id is a no-op
--   • only the session owner can close/pay it
--   • EXECUTE is authenticated/service_role only — anon is revoked
-- =============================================================================

BEGIN;

SELECT plan(24);

-- ── Setup ─────────────────────────────────────────────────────────────────────

SELECT tests.create_user('61616161-6161-6161-6161-616161616161'::uuid, 'flagged_member_00053');
SELECT tests.create_user('62626262-6262-6262-6262-626262626262'::uuid, 'unflagged_member_00053');
SELECT tests.create_user('63636363-6363-6363-6363-636363636363'::uuid, 'other_member_00053');
SELECT tests.create_user('64646464-6464-6464-6464-646464646464'::uuid, 'bonus_member_00053');

-- Pin the capability to 'targeted' regardless of its current admin-toggled
-- state, so "flagged" here means "holds a capability_grants row" exactly.
UPDATE public.capabilities SET state = 'targeted' WHERE key = 'session_rewards';

INSERT INTO public.capability_grants (key, member_id) VALUES
  ('session_rewards', '61616161-6161-6161-6161-616161616161'),
  ('session_rewards', '64646464-6464-6464-6464-646464646464');

-- decks.member_id is stamped by a trigger off auth.uid(), so the fixture deck
-- is created as an authenticated caller rather than as postgres.
SELECT tests.set_claims('61616161-6161-6161-6161-616161616161'::uuid);
SET LOCAL role = 'authenticated';

INSERT INTO public.decks (id, title, is_public) VALUES (650, 'Session Rewards Deck', false);
INSERT INTO public.cards (id, deck_id, front_text, back_text, rank) VALUES
  (6100, 650, 'Q1', 'A1', 'a0'), (6101, 650, 'Q2', 'A2', 'a1'), (6102, 650, 'Q3', 'A3', 'a2'),
  (6110, 650, 'Q4', 'A4', 'b0'), (6111, 650, 'Q5', 'A5', 'b1'),
  (6120, 650, 'Q6', 'A6', 'c0'), (6121, 650, 'Q7', 'A7', 'c1'), (6122, 650, 'Q8', 'A8', 'c2'),
  (6140, 650, 'Q9', 'A9', 'd0'), (6141, 650, 'Q10', 'A10', 'd1'),
  (6150, 650, 'Q11', 'A11', 'e0'), (6151, 650, 'Q12', 'A12', 'e1'),
  (6152, 650, 'Q13', 'A13', 'e2'), (6153, 650, 'Q14', 'A14', 'e3'), (6154, 650, 'Q15', 'A15', 'e4'),
  (6160, 650, 'Q16', 'A16', 'f0');

SET LOCAL role = 'postgres';

-- S1 (flagged member m1): re-answered card + a final Again, N = 2 correct,
-- with no difficulty set (bonus stays 0). base_this = round(0.2*1000*2) = 400
-- thousandths — a sub-clip remainder on its own.
INSERT INTO public.study_sessions (id, member_id) VALUES
  ('aaaa0001-0000-0000-0000-000000000001', '61616161-6161-6161-6161-616161616161');

-- S2 (flagged member m1): 3 more correct cards, N = 3, base_this = 600
-- thousandths — combined with S1's 400 this crosses a whole clip.
INSERT INTO public.study_sessions (id, member_id) VALUES
  ('aaaa0002-0000-0000-0000-000000000002', '61616161-6161-6161-6161-616161616161');

-- S4 (non-flagged member m2): otherwise-correct cards, no credit expected.
INSERT INTO public.study_sessions (id, member_id) VALUES
  ('aaaa0004-0000-0000-0000-000000000004', '62626262-6262-6262-6262-626262626262');

-- S5 (flagged member m1): N = 0 correct cards (no review_logs at all).
INSERT INTO public.study_sessions (id, member_id) VALUES
  ('aaaa0005-0000-0000-0000-000000000005', '61616161-6161-6161-6161-616161616161');

-- S7 (flagged member m1): owned by m1; a different member will attempt to close it.
INSERT INTO public.study_sessions (id, member_id) VALUES
  ('aaaa0007-0000-0000-0000-000000000007', '61616161-6161-6161-6161-616161616161');

-- S8 (bonus member m4): 5 correct cards at max difficulty (10), so each
-- card's factor is (10-1)/9 = 1 and the session sum is 5, clearing a whole
-- bonus clip in one session: floor(0.2 * 5) * 1000 = 1000.
INSERT INTO public.study_sessions (id, member_id) VALUES
  ('aaaa0008-0000-0000-0000-000000000008', '64646464-6464-6464-6464-646464646464');

-- S9 (bonus member m4): 1 correct card at a moderate difficulty (5), factor =
-- (5-1)/9 = 0.444, bonus = floor(0.2 * 0.444) * 1000 = floor(0.089) * 1000 = 0
-- — under the threshold, discarded rather than carried forward.
INSERT INTO public.study_sessions (id, member_id) VALUES
  ('aaaa0009-0000-0000-0000-000000000009', '64646464-6464-6464-6464-646464646464');

-- S1 fixtures:
--   6100: earlier rating 3 (correct), later rating 1 (Again) -> final excluded
--   6101: earlier rating 1 (Again), later rating 4 (correct) -> final counted
--   6102: single log, rating 2 (correct) -> counted
INSERT INTO public.review_logs (id, card_id, member_id, rating, state, due, review, session_id) VALUES
  (900100, 6100, '61616161-6161-6161-6161-616161616161', 3, 2, now() + interval '1 day', now() - interval '50 minutes', 'aaaa0001-0000-0000-0000-000000000001'),
  (900101, 6100, '61616161-6161-6161-6161-616161616161', 1, 1, now() + interval '10 minutes', now() - interval '49 minutes', 'aaaa0001-0000-0000-0000-000000000001'),
  (900102, 6101, '61616161-6161-6161-6161-616161616161', 1, 1, now() + interval '10 minutes', now() - interval '48 minutes', 'aaaa0001-0000-0000-0000-000000000001'),
  (900103, 6101, '61616161-6161-6161-6161-616161616161', 4, 2, now() + interval '1 day', now() - interval '47 minutes', 'aaaa0001-0000-0000-0000-000000000001'),
  (900104, 6102, '61616161-6161-6161-6161-616161616161', 2, 2, now() + interval '1 day', now() - interval '46 minutes', 'aaaa0001-0000-0000-0000-000000000001');

-- S2 fixtures: 3 distinct correct cards.
INSERT INTO public.review_logs (id, card_id, member_id, rating, state, due, review, session_id) VALUES
  (900110, 6110, '61616161-6161-6161-6161-616161616161', 2, 2, now() + interval '1 day', now() - interval '30 minutes', 'aaaa0002-0000-0000-0000-000000000002'),
  (900111, 6111, '61616161-6161-6161-6161-616161616161', 3, 2, now() + interval '1 day', now() - interval '29 minutes', 'aaaa0002-0000-0000-0000-000000000002'),
  (900112, 6120, '61616161-6161-6161-6161-616161616161', 4, 2, now() + interval '1 day', now() - interval '28 minutes', 'aaaa0002-0000-0000-0000-000000000002');

-- S4 fixtures: 2 distinct correct cards for a non-flagged member.
INSERT INTO public.review_logs (id, card_id, member_id, rating, state, due, review, session_id) VALUES
  (900120, 6121, '62626262-6262-6262-6262-626262626262', 2, 2, now() + interval '1 day', now() - interval '20 minutes', 'aaaa0004-0000-0000-0000-000000000004'),
  (900121, 6122, '62626262-6262-6262-6262-626262626262', 3, 2, now() + interval '1 day', now() - interval '19 minutes', 'aaaa0004-0000-0000-0000-000000000004');

-- S7 fixtures: 2 distinct correct cards, owned by the flagged member.
INSERT INTO public.review_logs (id, card_id, member_id, rating, state, due, review, session_id) VALUES
  (900140, 6140, '61616161-6161-6161-6161-616161616161', 2, 2, now() + interval '1 day', now() - interval '10 minutes', 'aaaa0007-0000-0000-0000-000000000007'),
  (900141, 6141, '61616161-6161-6161-6161-616161616161', 3, 2, now() + interval '1 day', now() - interval '9 minutes', 'aaaa0007-0000-0000-0000-000000000007');

-- S8 fixtures: 5 distinct correct cards at max difficulty (10).
INSERT INTO public.review_logs (id, card_id, member_id, rating, state, due, review, difficulty, session_id) VALUES
  (900150, 6150, '64646464-6464-6464-6464-646464646464', 2, 2, now() + interval '1 day', now() - interval '50 minutes', 10, 'aaaa0008-0000-0000-0000-000000000008'),
  (900151, 6151, '64646464-6464-6464-6464-646464646464', 3, 2, now() + interval '1 day', now() - interval '49 minutes', 10, 'aaaa0008-0000-0000-0000-000000000008'),
  (900152, 6152, '64646464-6464-6464-6464-646464646464', 4, 2, now() + interval '1 day', now() - interval '48 minutes', 10, 'aaaa0008-0000-0000-0000-000000000008'),
  (900153, 6153, '64646464-6464-6464-6464-646464646464', 2, 2, now() + interval '1 day', now() - interval '47 minutes', 10, 'aaaa0008-0000-0000-0000-000000000008'),
  (900154, 6154, '64646464-6464-6464-6464-646464646464', 3, 2, now() + interval '1 day', now() - interval '46 minutes', 10, 'aaaa0008-0000-0000-0000-000000000008');

-- S9 fixtures: 1 correct card at a moderate difficulty (5).
INSERT INTO public.review_logs (id, card_id, member_id, rating, state, due, review, difficulty, session_id) VALUES
  (900160, 6160, '64646464-6464-6464-6464-646464646464', 2, 2, now() + interval '1 day', now() - interval '5 minutes', 5, 'aaaa0009-0000-0000-0000-000000000009');


-- ── Obligation: re-answered card counts once; final Again excluded ──────────

SELECT tests.set_claims('61616161-6161-6161-6161-616161616161'::uuid);
SET LOCAL role = 'authenticated';

-- Test 1: closing S1 does not raise.
SELECT lives_ok(
  $$ SELECT public.close_study_session('aaaa0001-0000-0000-0000-000000000001'::uuid) $$,
  'closing a session with a re-answered card does not raise'
);

SET LOCAL role = 'postgres';

-- Test 2: closed_at is now set.
SELECT isnt(
  (SELECT closed_at FROM public.study_sessions
   WHERE id = 'aaaa0001-0000-0000-0000-000000000001'),
  NULL,
  'closing the session sets closed_at'
);

-- Test 3: N = 2 (6101 final-correct, 6102 correct; 6100 final-Again excluded)
-- pays session_base = round(0.2 * 1000 * 2) = 400 thousandths.
SELECT is(
  (SELECT pl.amount
     FROM public.paperclip_ledger pl
     JOIN public.member_rewards mm ON mm.id = pl.member_reward_id
    WHERE mm.member_id = '61616161-6161-6161-6161-616161616161'::uuid
      AND mm.occasion_ref = 'aaaa0001-0000-0000-0000-000000000001'
      AND pl.source = 'session_base'),
  400::bigint,
  'a re-answered card counts once by its final rating, and a final Again is excluded from N'
);

-- Test 4: base returned by close_study_session is 0 — this session alone
-- doesn't complete a whole clip.
SELECT results_eq(
  $$ SELECT base, bonus FROM public.close_study_session('aaaa0001-0000-0000-0000-000000000001'::uuid) $$,
  $$ VALUES (0::bigint, 0::bigint) $$,
  'a session whose own base is a sub-clip remainder reads base 0 and bonus 0'
);

CREATE TEMP TABLE _s1_snapshot AS
SELECT closed_at FROM public.study_sessions
WHERE id = 'aaaa0001-0000-0000-0000-000000000001';


-- ── Obligation: base crosses a whole clip across sessions ───────────────────

SELECT tests.set_claims('61616161-6161-6161-6161-616161616161'::uuid);
SET LOCAL role = 'authenticated';

-- Test 5: closing S2 does not raise.
SELECT lives_ok(
  $$ SELECT public.close_study_session('aaaa0002-0000-0000-0000-000000000002'::uuid) $$,
  'closing the second session does not raise'
);

SET LOCAL role = 'postgres';

-- Test 6: S2 pays session_base = round(0.2 * 1000 * 3) = 600 thousandths.
SELECT is(
  (SELECT pl.amount
     FROM public.paperclip_ledger pl
     JOIN public.member_rewards mm ON mm.id = pl.member_reward_id
    WHERE mm.member_id = '61616161-6161-6161-6161-616161616161'::uuid
      AND mm.occasion_ref = 'aaaa0002-0000-0000-0000-000000000002'
      AND pl.source = 'session_base'),
  600::bigint,
  'the second session pays session_base = round(0.2 * 1000 * 3) = 600 thousandths'
);

-- Test 7: 400 (S1) + 600 (S2) = 1000 thousandths crosses one whole clip, so
-- base reads 1 and balance reflects the new whole clip.
SELECT results_eq(
  $$ SELECT base, bonus, balance FROM public.close_study_session('aaaa0002-0000-0000-0000-000000000002'::uuid) $$,
  $$ VALUES (1::bigint, 0::bigint, 1::bigint) $$,
  'combining with the prior sub-clip remainder crosses a whole clip, reading base 1'
);


-- ── Obligation: closing the same session twice credits once ────────────────

SELECT tests.set_claims('61616161-6161-6161-6161-616161616161'::uuid);
SET LOCAL role = 'authenticated';

-- Test 8: closing the already-closed S1 a second time does not raise.
SELECT lives_ok(
  $$ SELECT public.close_study_session('aaaa0001-0000-0000-0000-000000000001'::uuid) $$,
  'closing an already-closed session a second time does not raise'
);

SET LOCAL role = 'postgres';

-- Test 9: exactly one member_rewards grant row exists for the occasion.
SELECT is(
  (SELECT count(*)::int FROM public.member_rewards
    WHERE member_id = '61616161-6161-6161-6161-616161616161'::uuid
      AND occasion_ref = 'aaaa0001-0000-0000-0000-000000000001'),
  1,
  'exactly one member_rewards grant row exists after closing the session twice'
);

-- Test 10: closed_at is unchanged by the second call.
SELECT is(
  (SELECT closed_at FROM public.study_sessions
   WHERE id = 'aaaa0001-0000-0000-0000-000000000001'),
  (SELECT closed_at FROM _s1_snapshot),
  'closed_at does not change on the second close'
);


-- ── Obligation: non-flagged member closes but earns no credit ──────────────

SELECT tests.set_claims('62626262-6262-6262-6262-626262626262'::uuid);
SET LOCAL role = 'authenticated';

-- Test 11: closing a non-flagged member's session does not raise.
SELECT lives_ok(
  $$ SELECT public.close_study_session('aaaa0004-0000-0000-0000-000000000004'::uuid) $$,
  'closing a non-flagged member''s session does not raise'
);

SET LOCAL role = 'postgres';

-- Test 12: no member_rewards grant row was written.
SELECT is_empty(
  $$
    SELECT 1 FROM public.member_rewards
     WHERE member_id = '62626262-6262-6262-6262-626262626262'::uuid
       AND occasion_ref = 'aaaa0004-0000-0000-0000-000000000004'
  $$,
  'a non-flagged member earns no member_rewards grant row'
);


-- ── Obligation: N = 0 closes with no credit ─────────────────────────────────

SELECT tests.set_claims('61616161-6161-6161-6161-616161616161'::uuid);
SET LOCAL role = 'authenticated';

-- Test 13: closing a session with no review_logs does not raise.
SELECT lives_ok(
  $$ SELECT public.close_study_session('aaaa0005-0000-0000-0000-000000000005'::uuid) $$,
  'closing a session with no review_logs does not raise'
);

SET LOCAL role = 'postgres';

-- Test 14: no member_rewards grant row was written for it.
SELECT is_empty(
  $$
    SELECT 1 FROM public.member_rewards
     WHERE occasion_ref = 'aaaa0005-0000-0000-0000-000000000005'
  $$,
  'N = 0 writes no member_rewards grant row'
);


-- ── Obligation: unknown session id is a no-op ────────────────────────────────

SELECT tests.set_claims('61616161-6161-6161-6161-616161616161'::uuid);
SET LOCAL role = 'authenticated';

-- Test 15: closing an unknown session id does not raise.
SELECT lives_ok(
  $$ SELECT public.close_study_session('aaaa0006-0000-0000-0000-000000000006'::uuid) $$,
  'closing an unknown session id does not raise'
);

SET LOCAL role = 'postgres';

-- Test 16: no member_rewards grant row was written for it.
SELECT is_empty(
  $$
    SELECT 1 FROM public.member_rewards
     WHERE occasion_ref = 'aaaa0006-0000-0000-0000-000000000006'
  $$,
  'closing an unknown session id credits nothing'
);


-- ── Obligation: only the owner can close/pay a session ──────────────────────

SELECT tests.set_claims('63636363-6363-6363-6363-636363636363'::uuid);
SET LOCAL role = 'authenticated';

-- Test 17: a non-owner closing another member's session does not raise.
SELECT lives_ok(
  $$ SELECT public.close_study_session('aaaa0007-0000-0000-0000-000000000007'::uuid) $$,
  'a non-owner closing another member''s session does not raise'
);

SET LOCAL role = 'postgres';

-- Test 18: the session's closed_at stays NULL.
SELECT is(
  (SELECT closed_at FROM public.study_sessions
   WHERE id = 'aaaa0007-0000-0000-0000-000000000007'),
  NULL,
  'a non-owner call leaves the owner''s session unclosed'
);


-- ── Obligation: bonus clears a whole clip within one session ────────────────

SELECT tests.set_claims('64646464-6464-6464-6464-646464646464'::uuid);
SET LOCAL role = 'authenticated';

-- Test 19: closing the max-difficulty session does not raise.
SELECT lives_ok(
  $$ SELECT public.close_study_session('aaaa0008-0000-0000-0000-000000000008'::uuid) $$,
  'closing a session with max-difficulty correct cards does not raise'
);

SET LOCAL role = 'postgres';

-- Test 20: base = round(0.2*1000*5) = 1000 (one whole clip on a fresh
-- member), bonus = floor(0.2*5)*1000 = 1000 (one whole clip), and balance
-- reflects both: base + bonus = balance's jump from 0.
SELECT results_eq(
  $$ SELECT base, bonus, balance FROM public.close_study_session('aaaa0008-0000-0000-0000-000000000008'::uuid) $$,
  $$ VALUES (1::bigint, 1::bigint, 2::bigint) $$,
  'a difficulty-heavy session clears a whole base clip and a whole bonus clip in one session'
);


-- ── Obligation: an under-threshold bonus is discarded, never carried ────────

SELECT tests.set_claims('64646464-6464-6464-6464-646464646464'::uuid);
SET LOCAL role = 'authenticated';

-- Test 21: closing the moderate-difficulty session does not raise.
SELECT lives_ok(
  $$ SELECT public.close_study_session('aaaa0009-0000-0000-0000-000000000009'::uuid) $$,
  'closing a session with an under-threshold bonus does not raise'
);

SET LOCAL role = 'postgres';

-- Test 22: no session_bonus ledger row was written for this occasion.
SELECT is_empty(
  $$
    SELECT 1
      FROM public.paperclip_ledger pl
      JOIN public.member_rewards mm ON mm.id = pl.member_reward_id
     WHERE mm.member_id = '64646464-6464-6464-6464-646464646464'::uuid
       AND mm.occasion_ref = 'aaaa0009-0000-0000-0000-000000000009'
       AND pl.source = 'session_bonus'
  $$,
  'a bonus under one whole clip writes no session_bonus ledger row and is discarded'
);


-- ── EXECUTE grants ────────────────────────────────────────────────────────────

-- Test 23: authenticated can execute close_study_session().
SELECT is(
  has_function_privilege('authenticated', 'public.close_study_session(uuid)', 'EXECUTE'),
  true,
  'authenticated can execute close_study_session()'
);

-- Test 24: anon cannot execute close_study_session().
SELECT is(
  has_function_privilege('anon', 'public.close_study_session(uuid)', 'EXECUTE'),
  false,
  'anon cannot execute close_study_session()'
);

SELECT * FROM finish();
ROLLBACK;
