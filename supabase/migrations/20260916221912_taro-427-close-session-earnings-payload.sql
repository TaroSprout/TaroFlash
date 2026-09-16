-- knowledge: close_study_session — unrecorded

drop function if exists "public"."close_study_session"(p_session_id uuid);

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.close_study_session(p_session_id uuid)
 RETURNS TABLE(earned bigint, balance bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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

  IF NOT FOUND OR NOT public.capability_is_live('session_rewards') THEN
    RETURN QUERY SELECT 0::bigint, 0::bigint;
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
   WHERE final_logs.rating <> 1; -- 1 is ts-fsrs Rating.Again (a fail)

  IF v_correct > 0 THEN
    PERFORM public.credit_occasion_reward(
      v_uid,
      'study.session_completion_bonus',
      p_session_id::text,
      v_correct
    );
  END IF;

  RETURN QUERY
  SELECT
    COALESCE((
      SELECT pl.amount
        FROM public.paperclip_ledger pl
        JOIN public.member_rewards mr ON mr.id = pl.member_reward_id
        JOIN public.reward_rules rr ON rr.id = mr.reward_rule_id
       WHERE mr.member_id = v_uid
         AND rr.key = 'study.session_completion_bonus'
         AND mr.occasion_ref = p_session_id::text
    ), 0)::bigint AS earned,
    COALESCE((
      SELECT pb.balance
        FROM public.paperclip_balance pb
       WHERE pb.member_id = v_uid
    ), 0)::bigint AS balance;
END;
$function$
;

ALTER FUNCTION public.close_study_session(p_session_id uuid) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.close_study_session(p_session_id uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.close_study_session(p_session_id uuid) FROM anon;
GRANT ALL ON FUNCTION public.close_study_session(p_session_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.close_study_session(p_session_id uuid) TO service_role;

