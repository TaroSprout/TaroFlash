drop function if exists "public"."save_review"(p_card_id bigint, p_due timestamp with time zone, p_stability real, p_difficulty real, p_elapsed_days smallint, p_scheduled_days smallint, p_reps smallint, p_lapses smallint, p_last_review timestamp with time zone, p_card_state smallint, p_rating smallint, p_state smallint, p_log_due timestamp with time zone, p_log_stability real, p_log_difficulty real, p_log_scheduled_days smallint, p_review timestamp with time zone, p_learning_steps smallint);

set check_function_bodies = off;

create type "public"."review_card_state" as ("due" timestamp with time zone, "stability" real, "difficulty" real, "elapsed_days" smallint, "scheduled_days" smallint, "reps" smallint, "lapses" smallint, "last_review" timestamp with time zone, "state" smallint, "learning_steps" smallint);

create type "public"."review_log_entry" as ("rating" smallint, "state" smallint, "due" timestamp with time zone, "stability" real, "difficulty" real, "scheduled_days" smallint, "review" timestamp with time zone);

CREATE OR REPLACE FUNCTION public.save_review(p_card_id bigint, p_card public.review_card_state, p_log public.review_log_entry)
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
    (p_card).due, (p_card).stability, (p_card).difficulty, (p_card).elapsed_days,
    (p_card).scheduled_days, (p_card).reps, (p_card).lapses, (p_card).last_review, (p_card).state,
    COALESCE((p_card).learning_steps, 0)
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
    (p_log).rating, (p_log).state, (p_log).due,
    (p_log).stability, (p_log).difficulty,
    (p_log).scheduled_days,
    (p_log).review
  )
  -- Idempotent replay: a retried save (offline recovery) re-runs the exact same
  -- review event, so swallow the duplicate rather than growing history. The
  -- reviews upsert above is already idempotent via ON CONFLICT (card_id).
  ON CONFLICT (member_id, card_id, review) DO NOTHING;
END;
$function$
;

-- db diff never emits function grants, and dropping the old signature dropped
-- its grants — hand-restore them so the new signature matches the declared
-- schema instead of leaning on the default PUBLIC execute.
GRANT ALL ON FUNCTION public.save_review(p_card_id bigint, p_card public.review_card_state, p_log public.review_log_entry) TO anon;
GRANT ALL ON FUNCTION public.save_review(p_card_id bigint, p_card public.review_card_state, p_log public.review_log_entry) TO authenticated;
GRANT ALL ON FUNCTION public.save_review(p_card_id bigint, p_card public.review_card_state, p_log public.review_log_entry) TO service_role;


