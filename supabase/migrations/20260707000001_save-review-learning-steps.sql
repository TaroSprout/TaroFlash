-- =============================================================================
-- save_review: persist card.learning_steps
-- =============================================================================
--
-- reviews.learning_steps has existed since the original deck-crud migration
-- but save_review never wrote to it — it was always stale/NULL. ts-fsrs
-- defaults a missing value to step 0, which happens to be the correct
-- starting index, so this has been silently harmless so far. But a card that
-- fails partway through a multi-step learning/relearning sequence (e.g.
-- ['1m', '10m']) and gets refetched between steps would incorrectly restart
-- at step 0 instead of resuming where it left off. Wiring this through closes
-- that gap.
--
-- SIGNATURE CHANGE: save_review grows a trailing parameter. CREATE OR REPLACE
-- only replaces a function whose argument list is IDENTICAL — DROP first so a
-- stale narrower overload can't linger and cause "function is not unique".
-- =============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.save_review(
  bigint, timestamp with time zone, real, real, smallint, smallint, smallint,
  smallint, timestamp with time zone, smallint, smallint, smallint,
  timestamp with time zone, real, real, smallint, timestamp with time zone
);

CREATE FUNCTION public.save_review(
  -- Which card
  p_card_id           bigint,

  -- FSRS Card fields (item.card) → upserted into reviews
  p_due               timestamp with time zone,
  p_stability         real,
  p_difficulty        real,
  p_elapsed_days      smallint,
  p_scheduled_days    smallint,
  p_reps              smallint,
  p_lapses            smallint,
  p_last_review       timestamp with time zone,
  p_card_state        smallint,

  -- FSRS ReviewLog fields (item.log) → inserted into review_logs
  p_rating            smallint,
  p_state             smallint,
  p_log_due           timestamp with time zone,
  p_log_stability     real,
  p_log_difficulty    real,
  p_log_scheduled_days    smallint,
  p_review            timestamp with time zone,

  p_learning_steps    smallint DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify the card belongs to this user before writing anything
  IF NOT EXISTS (
    SELECT 1 FROM public.cards
    WHERE id = p_card_id AND member_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Card not found or not owned by user';
  END IF;

  -- Update current FSRS state (upsert so new cards get their first review row)
  INSERT INTO public.reviews (
    card_id, member_id,
    due, stability, difficulty, elapsed_days,
    scheduled_days, reps, lapses, last_review, state, learning_steps
  )
  VALUES (
    p_card_id, v_uid,
    p_due, p_stability, p_difficulty, p_elapsed_days,
    p_scheduled_days, p_reps, p_lapses, p_last_review, p_card_state, p_learning_steps
  )
  ON CONFLICT (card_id) DO UPDATE SET
    due            = EXCLUDED.due,
    stability      = EXCLUDED.stability,
    difficulty     = EXCLUDED.difficulty,
    elapsed_days   = EXCLUDED.elapsed_days,
    scheduled_days = EXCLUDED.scheduled_days,
    reps           = EXCLUDED.reps,
    lapses         = EXCLUDED.lapses,
    last_review    = EXCLUDED.last_review,
    state          = EXCLUDED.state,
    learning_steps = EXCLUDED.learning_steps;

  -- Append the review event to history
  INSERT INTO public.review_logs (
    card_id, member_id,
    rating, state, due,
    stability, difficulty,
    scheduled_days,
    review
  )
  VALUES (
    p_card_id, v_uid,
    p_rating, p_state, p_log_due,
    p_log_stability, p_log_difficulty,
    p_log_scheduled_days,
    p_review
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_review(
  bigint, timestamp with time zone, real, real, smallint, smallint, smallint,
  smallint, timestamp with time zone, smallint, smallint, smallint,
  timestamp with time zone, real, real, smallint, timestamp with time zone, smallint
) TO authenticated;

COMMIT;
