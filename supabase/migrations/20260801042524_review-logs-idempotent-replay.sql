-- De-dupe existing history before the unique index can be built: any
-- (member_id, card_id, review) that was written more than once (a pre-fix
-- retry) collapses to its earliest row. Must run before CREATE UNIQUE INDEX or
-- the index build fails on the existing duplicates.
DELETE FROM public.review_logs a
USING public.review_logs b
WHERE a.id > b.id
  AND a.member_id = b.member_id
  AND a.card_id = b.card_id
  AND a.review = b.review;

CREATE UNIQUE INDEX review_logs_member_card_review_key ON public.review_logs USING btree (member_id, card_id, review);

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.save_review(p_card_id bigint, p_due timestamp with time zone, p_stability real, p_difficulty real, p_elapsed_days smallint, p_scheduled_days smallint, p_reps smallint, p_lapses smallint, p_last_review timestamp with time zone, p_card_state smallint, p_rating smallint, p_state smallint, p_log_due timestamp with time zone, p_log_stability real, p_log_difficulty real, p_log_scheduled_days smallint, p_review timestamp with time zone, p_learning_steps smallint DEFAULT 0)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  -- active_member_id(), not auth.uid(). SECURITY DEFINER means RLS never runs
  -- here, so the policy sweep that suspends a pending-deletion account does not
  -- reach this function — it would happily keep writing reviews for an account
  -- whose data is supposed to be frozen. The ownership check below is the only
  -- gate there is, so it has to be the one that knows about suspension.
  v_uid uuid := public.active_member_id();
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
  )
  -- Idempotent replay: a retried save (offline recovery) re-runs the exact same
  -- review event, so swallow the duplicate rather than growing history. The
  -- reviews upsert above is already idempotent via ON CONFLICT (card_id).
  ON CONFLICT (member_id, card_id, review) DO NOTHING;
END;
$function$
;


