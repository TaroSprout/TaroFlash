-- Same overload-drift class as 20260716000008, second instance: the original
-- 16-arg save_review from 20260411000007 was orphaned when 20260411000009
-- grew the arg list (p_card_state) via CREATE OR REPLACE — which, with a
-- different argument list, creates a NEW overload instead of replacing.
-- 20260707000001 correctly DROP-first'd, but targeted only the 17-arg
-- intermediate, so the 16-arg original still lingers.
--
-- Harmless today (PostgREST resolves the FE's 18 named args to the live
-- 18-arg function only), but it's a landmine for positional SQL callers and
-- trips the no-duplicate-overloads guard in supabase/tests. Drop it.

BEGIN;

DROP FUNCTION IF EXISTS public.save_review(
  bigint, timestamp with time zone, real, real, smallint, smallint, smallint,
  smallint, timestamp with time zone, smallint, smallint,
  timestamp with time zone, real, real, smallint, timestamp with time zone
);

COMMIT;
