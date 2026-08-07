-- =============================================================================
-- Guard: which SECURITY DEFINER functions client roles may execute
-- =============================================================================
-- A SECURITY DEFINER function runs as its owner, so RLS never applies inside
-- it — whatever guard it performs on the caller IS the security boundary. And
-- `supabase db diff` emits no function grants at all, so a new definer function
-- lands with EXECUTE for PUBLIC and nothing in the review surface says so.
--
-- The allow-list below is the reviewed answer to "may an unauthenticated caller
-- run this?". Adding a definer function fails this test until it is either
-- listed here with a reason or revoked, which turns a silent default into a
-- decision. reap_stalled_lessons and invoke_lesson_process were found exposed
-- this way and revoked in 20260807180000.
-- =============================================================================

BEGIN;

SELECT plan(2);

-- Trigger functions are unreachable over PostgREST (no way to call one as an
-- RPC), so their grants carry no client-facing risk and stay out of scope.
CREATE TEMP TABLE reviewed_anon_definer (proname text PRIMARY KEY, reason text);
INSERT INTO reviewed_anon_definer VALUES
  ('active_member_id',        'reads the current session; returns null for anon'),
  ('assert_deck_card_limits', 'no-ops when auth.uid() has no member row; raises or returns void'),
  ('auth_plan',               'reads the current session; returns null for anon'),
  ('auth_role',               'reads the current session; returns null for anon'),
  ('is_display_name_available','intentionally public — signup runs before a session exists'),
  ('member_public_profile',   'intentionally public — public profile projection'),
  ('reset_deck_reviews',      'raises Not authenticated, then checks deck ownership'),
  ('save_review',             'raises Not authenticated, then checks card ownership');

SELECT is_empty(
  $$
    SELECT p.proname::text
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prosecdef
       AND p.prorettype <> 'trigger'::regtype
       AND has_function_privilege('anon', p.oid, 'EXECUTE')
       AND p.proname NOT IN (SELECT proname FROM reviewed_anon_definer)
     ORDER BY 1
  $$,
  'no SECURITY DEFINER function is anon-executable without an explicit review entry'
);

-- Catches the reverse drift: a function is locked down (or deleted) but its
-- entry lingers, quietly widening what the list above is understood to permit.
SELECT is_empty(
  $$
    SELECT r.proname
      FROM reviewed_anon_definer r
     WHERE NOT EXISTS (
       SELECT 1
         FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = r.proname
          AND p.prosecdef
          AND has_function_privilege('anon', p.oid, 'EXECUTE')
     )
     ORDER BY 1
  $$,
  'every review entry still matches a live anon-executable definer function'
);

SELECT * FROM finish();
ROLLBACK;
