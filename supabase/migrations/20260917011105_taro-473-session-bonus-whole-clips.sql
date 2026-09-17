-- knowledge: close_study_session, credit_occasion_reward, get_session_earnings — corpus/rewards/rewards.md

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.close_study_session(p_session_id uuid)
 RETURNS TABLE(base bigint, bonus bigint, balance bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
    RETURN QUERY SELECT 0::bigint, 0::bigint, 0::bigint;
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
    (floor(t.base_cumulative / 1000.0) - floor((t.base_cumulative - t.base_this) / 1000.0))::bigint AS base,
    floor(t.bonus_this / 1000.0)::bigint AS bonus,
    COALESCE((
      SELECT pb.balance
        FROM public.paperclip_balance pb
       WHERE pb.member_id = v_uid
    ), 0)::bigint AS balance
  FROM (
    SELECT
      COALESCE((
        SELECT sum(pl.amount)
          FROM public.paperclip_ledger pl
          JOIN public.member_rewards mr ON mr.id = pl.member_reward_id
          JOIN public.reward_rules rr ON rr.id = mr.reward_rule_id
         WHERE mr.member_id = v_uid
           AND rr.key = 'study.session_completion_bonus'
           AND pl.source = 'session_base'
      ), 0) AS base_cumulative,
      COALESCE((
        SELECT sum(pl.amount)
          FROM public.paperclip_ledger pl
          JOIN public.member_rewards mr ON mr.id = pl.member_reward_id
          JOIN public.reward_rules rr ON rr.id = mr.reward_rule_id
         WHERE mr.member_id = v_uid
           AND rr.key = 'study.session_completion_bonus'
           AND mr.occasion_ref = p_session_id::text
           AND pl.source = 'session_base'
      ), 0) AS base_this,
      COALESCE((
        SELECT sum(pl.amount)
          FROM public.paperclip_ledger pl
          JOIN public.member_rewards mr ON mr.id = pl.member_reward_id
          JOIN public.reward_rules rr ON rr.id = mr.reward_rule_id
         WHERE mr.member_id = v_uid
           AND rr.key = 'study.session_completion_bonus'
           AND mr.occasion_ref = p_session_id::text
           AND pl.source = 'session_bonus'
      ), 0) AS bonus_this
  ) t;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.credit_occasion_reward(p_member uuid, p_rule_key text, p_occasion_ref text, p_correct_count bigint, p_difficulty_factor numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_rule    public.reward_rules%ROWTYPE;
  v_base    bigint;
  v_bonus   bigint;
  v_rewards jsonb := '[]'::jsonb;
  v_grant   bigint;
BEGIN
  SELECT * INTO v_rule
    FROM public.reward_rules
   WHERE key = p_rule_key AND is_active;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown or inactive reward rule: %', p_rule_key;
  END IF;

  IF v_rule.resolver = 'per_card' THEN
    v_base  := round((v_rule.params ->> 'base')::numeric * 1000 * p_correct_count)::bigint;
    v_bonus := floor((v_rule.params ->> 'bonus')::numeric * p_difficulty_factor)::bigint * 1000;
  ELSE
    RAISE EXCEPTION 'Unknown resolver kind: %', v_rule.resolver;
  END IF;

  IF v_base <= 0 AND v_bonus <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.member_rewards (member_id, reward_rule_id, occasion_ref)
  VALUES (p_member, v_rule.id, p_occasion_ref)
  ON CONFLICT (member_id, reward_rule_id, occasion_ref) WHERE reward_rule_id IS NOT NULL DO NOTHING
  RETURNING id INTO v_grant;

  IF v_grant IS NULL THEN
    RETURN;
  END IF;

  IF v_base > 0 THEN
    v_rewards := v_rewards || jsonb_build_object('kind', 'paperclips', 'amount', v_base, 'source', 'session_base');
  END IF;

  IF v_bonus > 0 THEN
    v_rewards := v_rewards || jsonb_build_object('kind', 'paperclips', 'amount', v_bonus, 'source', 'session_bonus');
  END IF;

  PERFORM public.apply_reward(p_member, v_rewards, v_grant);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_session_earnings(p_session_id uuid)
 RETURNS TABLE(base bigint, bonus bigint, balance bigint)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT
    (floor(t.base_cumulative / 1000.0) - floor((t.base_cumulative - t.base_this) / 1000.0))::bigint AS base,
    floor(t.bonus_this / 1000.0)::bigint AS bonus,
    COALESCE((
      SELECT pb.balance
        FROM public.paperclip_balance pb
       WHERE pb.member_id = public.active_member_id()
    ), 0)::bigint AS balance
  FROM (
    SELECT
      COALESCE((
        SELECT sum(pl.amount)
          FROM public.paperclip_ledger pl
          JOIN public.member_rewards mr ON mr.id = pl.member_reward_id
          JOIN public.reward_rules rr ON rr.id = mr.reward_rule_id
         WHERE mr.member_id = public.active_member_id()
           AND rr.key = 'study.session_completion_bonus'
           AND pl.source = 'session_base'
      ), 0) AS base_cumulative,
      COALESCE((
        SELECT sum(pl.amount)
          FROM public.paperclip_ledger pl
          JOIN public.member_rewards mr ON mr.id = pl.member_reward_id
          JOIN public.reward_rules rr ON rr.id = mr.reward_rule_id
         WHERE mr.member_id = public.active_member_id()
           AND rr.key = 'study.session_completion_bonus'
           AND mr.occasion_ref = p_session_id::text
           AND pl.source = 'session_base'
      ), 0) AS base_this,
      COALESCE((
        SELECT sum(pl.amount)
          FROM public.paperclip_ledger pl
          JOIN public.member_rewards mr ON mr.id = pl.member_reward_id
          JOIN public.reward_rules rr ON rr.id = mr.reward_rule_id
         WHERE mr.member_id = public.active_member_id()
           AND rr.key = 'study.session_completion_bonus'
           AND mr.occasion_ref = p_session_id::text
           AND pl.source = 'session_bonus'
      ), 0) AS bonus_this
  ) t;
$function$
;


