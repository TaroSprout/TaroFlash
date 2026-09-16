SET check_function_bodies = false;

CREATE FUNCTION public.close_study_session(p_session_id uuid) RETURNS TABLE(base numeric, bonus numeric, balance numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_uid uuid := public.active_member_id();
  v_correct bigint;
  v_difficulty_factor numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.study_sessions
     SET closed_at = COALESCE(closed_at, now())
   WHERE id = p_session_id
     AND member_id = v_uid;

  IF NOT FOUND OR NOT public.capability_is_live('session_rewards') THEN
    RETURN QUERY SELECT 0::numeric, 0::numeric, 0::numeric;
    RETURN;
  END IF;

  SELECT count(*), COALESCE(sum((greatest(COALESCE(final_logs.difficulty, 1), 1) - 1) / 9.0), 0)
    INTO v_correct, v_difficulty_factor
    FROM (
      SELECT DISTINCT ON (rl.card_id) rl.rating, rl.difficulty
        FROM public.review_logs rl
       WHERE rl.session_id = p_session_id
         AND rl.member_id = v_uid
       ORDER BY rl.card_id, rl.review DESC, rl.id DESC -- keep each card's final rating, so a card re-studied within the session counts once, by its last outcome
    ) final_logs
   WHERE final_logs.rating <> 1; -- 1 is ts-fsrs Rating.Again (a fail)

  IF v_correct > 0 THEN
    PERFORM public.credit_occasion_reward(
      v_uid,
      'study.session_completion_bonus',
      p_session_id::text,
      v_correct,
      v_difficulty_factor
    );
  END IF;

  RETURN QUERY
  SELECT
    round(COALESCE((
      SELECT sum(pl.amount)
        FROM public.paperclip_ledger pl
        JOIN public.member_rewards mr ON mr.id = pl.member_reward_id
        JOIN public.reward_rules rr ON rr.id = mr.reward_rule_id
       WHERE mr.member_id = v_uid
         AND rr.key = 'study.session_completion_bonus'
         AND mr.occasion_ref = p_session_id::text
         AND pl.source = 'session_base'
    ), 0) / 1000.0, 3) AS base,
    round(COALESCE((
      SELECT sum(pl.amount)
        FROM public.paperclip_ledger pl
        JOIN public.member_rewards mr ON mr.id = pl.member_reward_id
        JOIN public.reward_rules rr ON rr.id = mr.reward_rule_id
       WHERE mr.member_id = v_uid
         AND rr.key = 'study.session_completion_bonus'
         AND mr.occasion_ref = p_session_id::text
         AND pl.source = 'session_bonus'
    ), 0) / 1000.0, 3) AS bonus,
    round(COALESCE((
      SELECT sum(pl.amount)
        FROM public.paperclip_ledger pl
       WHERE pl.member_id = v_uid
    ), 0) / 1000.0, 3) AS balance;
END;
$$;


ALTER FUNCTION public.close_study_session(p_session_id uuid) OWNER TO postgres;


REVOKE ALL ON FUNCTION public.close_study_session(p_session_id uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.close_study_session(p_session_id uuid) FROM anon;
GRANT ALL ON FUNCTION public.close_study_session(p_session_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.close_study_session(p_session_id uuid) TO service_role;
