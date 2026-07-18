-- =============================================================================
-- Function overload drift guard
--
-- CREATE OR REPLACE FUNCTION only replaces a function whose argument list
-- matches EXACTLY — with a changed arg list it silently creates a second
-- overload. PostgREST then resolves RPC calls by the named args the client
-- sends, so the FE can end up pinned to a stale overload while migrations
-- keep "updating" a function it never calls. This happened twice:
--   * get_study_session_cards — stale 3-arg overload served sessions with no
--     daily caps after 20260716000004 (fixed in 20260716000008)
--   * save_review — orphaned 16-arg original lingered since 20260411000009
--     (dropped in 20260716000009)
--
-- Guards:
--   1. No public function has more than one overload. If you intentionally
--      add an overload, exempt it explicitly in the query below.
--   2. The signatures the FE actually sends (named RPC args) exist verbatim,
--      so a signature-changing migration that forgets DROP-first turns CI red
--      here instead of silently forking.
-- =============================================================================

BEGIN;

SELECT plan(4);

-- Test 1: every public function name maps to exactly one overload.
SELECT is_empty(
  $$
  SELECT p.proname || ': ' || string_agg(pg_get_function_identity_arguments(p.oid), ' | ')
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
  GROUP BY p.proname
  HAVING count(*) > 1
  $$,
  'no public function has multiple overloads (DROP the old signature before CREATE-ing a new one)'
);

-- Test 2: get_study_session_cards exists with its current 2-arg signature —
-- p_study_all was dropped (refactor/study-session-multi-deck). The FE no
-- longer calls this RPC directly (src/api/cards/db/study-session-cards.ts was
-- deleted); it's now only reached internally, per-deck, from
-- get_session_decks_and_cards, which owns the FE-facing contract instead.
SELECT has_function(
  'public',
  'get_study_session_cards',
  ARRAY['bigint', 'timestamp with time zone'],
  'get_study_session_cards has the (p_deck_id, p_today_start) signature — p_study_all was dropped'
);

-- Test 2b [obligation]: get_session_decks_and_cards exists with the exact
-- signature the FE sends (src/api/cards/db/session-bootstrap.ts) — this RPC
-- is now the FE-facing study-session bootstrap contract.
SELECT has_function(
  'public',
  'get_session_decks_and_cards',
  ARRAY['bigint[]', 'timestamp with time zone'],
  'get_session_decks_and_cards has the (p_deck_ids, p_today_start) signature the FE sends [obligation]'
);

-- Test 3: save_review exists with the exact 18-arg signature the FE calls
-- (src/api/reviews/db/index.ts).
SELECT has_function(
  'public',
  'save_review',
  ARRAY[
    'bigint', 'timestamp with time zone', 'real', 'real', 'smallint',
    'smallint', 'smallint', 'smallint', 'timestamp with time zone',
    'smallint', 'smallint', 'smallint', 'timestamp with time zone', 'real',
    'real', 'smallint', 'timestamp with time zone', 'smallint'
  ],
  'save_review has the 18-arg signature (incl. p_card_state + p_learning_steps) the FE sends'
);

SELECT * FROM finish();
ROLLBACK;
