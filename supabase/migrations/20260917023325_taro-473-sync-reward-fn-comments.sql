-- knowledge: apply_reward, close_study_session, credit_occasion_reward, get_session_earnings — corpus/rewards/rewards.md

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.apply_reward(p_member uuid, p_rewards jsonb, p_member_reward bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_reward jsonb;
  v_kind   text;
BEGIN
  -- Walk the reward list and dispatch on kind. Each branch resolves its payload
  -- entry as a spec and persists the concrete outcome, so a future randomized
  -- reward computes its value here without any change upstream in record_progress
  -- — and editing a milestone's reward payload later never touches what an
  -- already-earned member was actually paid →[K:reward-payout-is-resolved-not-spec].
  FOR v_reward IN SELECT * FROM jsonb_array_elements(p_rewards)
  LOOP
    v_kind := v_reward ->> 'kind';

    IF v_kind = 'paperclips' THEN
      -- The ledger is the only place a balance lives; this insert is the sole
      -- writer. The resolved amount is what gets stored, never the spec.
      -- A payload omitting source is a milestone payout; session rewards set
      -- session_base/session_bonus explicitly, so no row is left unattributed.
      INSERT INTO public.paperclip_ledger (member_id, amount, source, member_reward_id)
      VALUES (p_member, (v_reward ->> 'amount')::bigint, COALESCE(v_reward ->> 'source', 'milestone'), p_member_reward);
    ELSE
      RAISE EXCEPTION 'Unknown reward kind: %', v_kind;
    END IF;
  END LOOP;
END;
$function$
;

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

  -- ts-fsrs card difficulty runs 1–10; (difficulty−1)/9 normalizes each
  -- correct card to 0–1 (easiest 0, hardest 1) — the per-card sum is the
  -- session's difficulty factor passed to credit_occasion_reward.
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
    -- Base credits the boundary-crossing session, not the sessions that filled the clip →[K:session-base-credited-on-boundary-cross]
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
    -- Scaled into thousandths (×1000) and rounded rather than floored, so the
    -- fraction is stored exactly and accumulates across sessions — the
    -- deliberate asymmetry with the floored bonus below.
    v_base  := round((v_rule.params ->> 'base')::numeric * 1000 * p_correct_count)::bigint;
    -- floor() runs before the ×1000 scale, so the bonus's fractional remainder
    -- is discarded here — never recorded, never carried into a future
    -- session, unlike v_base's fraction above →[K:session-bonus-remainder-discarded]
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
    -- Base credits the boundary-crossing session, not the sessions that filled the clip →[K:session-base-credited-on-boundary-cross]
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


