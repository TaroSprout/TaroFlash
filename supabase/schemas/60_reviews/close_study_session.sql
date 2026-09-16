SET check_function_bodies = false;

CREATE FUNCTION public.close_study_session(p_session_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_uid uuid := public.active_member_id();
  v_correct bigint;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.study_sessions
     SET closed_at = COALESCE(closed_at, now())
   WHERE id = p_session_id
     AND member_id = v_uid;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF NOT public.capability_is_live('session_rewards') THEN
    RETURN;
  END IF;

  SELECT count(*) INTO v_correct
    FROM (
      SELECT DISTINCT ON (rl.card_id) rl.rating
        FROM public.review_logs rl
       WHERE rl.session_id = p_session_id
         AND rl.member_id = v_uid
       ORDER BY rl.card_id, rl.review DESC, rl.id DESC -- keep each card's final rating, so a card re-studied within the session counts once, by its last outcome
    ) final_logs
   WHERE final_logs.rating <> 1; -- 1 is ts-fsrs Rating.Again (a fail); this count feeds credit_occasion_reward's p_count bonus curve

  IF v_correct = 0 THEN
    RETURN;
  END IF;

  PERFORM public.credit_occasion_reward(
    v_uid,
    'study.session_completion_bonus',
    p_session_id::text,
    v_correct
  );
END;
$$;


ALTER FUNCTION public.close_study_session(p_session_id uuid) OWNER TO postgres;


REVOKE ALL ON FUNCTION public.close_study_session(p_session_id uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.close_study_session(p_session_id uuid) FROM anon;
GRANT ALL ON FUNCTION public.close_study_session(p_session_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.close_study_session(p_session_id uuid) TO service_role;
