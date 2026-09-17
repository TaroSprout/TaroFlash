-- knowledge: paperclip_ledger, paperclip_balance, apply_reward, credit_occasion_reward, get_session_earnings — corpus/rewards/rewards.md
-- knowledge: close_study_session — corpus/rewards/rewards.md

drop view if exists "public"."paperclip_balance";

alter table "public"."paperclip_ledger" add column "source" text;

update public.paperclip_ledger set amount = amount * 1000;

update public.paperclip_ledger pl
   set source = case when mr.reward_rule_id is not null then 'session_bonus' else 'milestone' end
  from public.member_rewards mr
 where mr.id = pl.member_reward_id;

update public.paperclip_ledger set source = 'milestone' where source is null;

alter table "public"."paperclip_ledger" alter column "source" set not null;

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
      INSERT INTO public.paperclip_ledger (member_id, amount, source, member_reward_id)
      VALUES (p_member, (v_reward ->> 'amount')::bigint, v_reward ->> 'source', p_member_reward);
    ELSE
      RAISE EXCEPTION 'Unknown reward kind: %', v_kind;
    END IF;
  END LOOP;
END;
$function$
;

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
      SELECT floor(pl.amount / 1000.0)
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

CREATE OR REPLACE FUNCTION public.credit_occasion_reward(p_member uuid, p_rule_key text, p_occasion_ref text, p_count bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_rule   public.reward_rules%ROWTYPE;
  v_amount bigint;
  v_grant  bigint;
BEGIN
  SELECT * INTO v_rule
    FROM public.reward_rules
   WHERE key = p_rule_key AND is_active;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown or inactive reward rule: %', p_rule_key;
  END IF;

  IF v_rule.resolver = 'curve' THEN
    v_amount := round(
      (v_rule.params ->> 'max_bonus')::numeric
      * (1 - power((v_rule.params ->> 'decay')::numeric, p_count::numeric))
    )::bigint;
  ELSE
    RAISE EXCEPTION 'Unknown resolver kind: %', v_rule.resolver;
  END IF;

  IF v_amount <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.member_rewards (member_id, reward_rule_id, occasion_ref)
  VALUES (p_member, v_rule.id, p_occasion_ref)
  ON CONFLICT (member_id, reward_rule_id, occasion_ref) WHERE reward_rule_id IS NOT NULL DO NOTHING
  RETURNING id INTO v_grant;

  IF v_grant IS NULL THEN
    RETURN;
  END IF;

  PERFORM public.apply_reward(
    p_member,
    jsonb_build_array(jsonb_build_object('kind', 'paperclips', 'amount', v_amount * 1000, 'source', 'session_bonus')),
    v_grant
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_session_earnings(p_session_id uuid)
 RETURNS TABLE(earned bigint, balance bigint)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT
    COALESCE((
      SELECT floor(pl.amount / 1000.0)
        FROM public.paperclip_ledger pl
        JOIN public.member_rewards mr ON mr.id = pl.member_reward_id
        JOIN public.reward_rules rr ON rr.id = mr.reward_rule_id
       WHERE mr.member_id = public.active_member_id()
         AND rr.key = 'study.session_completion_bonus'
         AND mr.occasion_ref = p_session_id::text
    ), 0)::bigint AS earned,
    COALESCE((
      SELECT pb.balance
        FROM public.paperclip_balance pb
       WHERE pb.member_id = public.active_member_id()
    ), 0)::bigint AS balance;
$function$
;

create or replace view "public"."paperclip_balance" with (security_invoker='true') as
    SELECT member_id,
           COALESCE(sum(amount) / 1000, 0)::bigint AS balance
      FROM public.paperclip_ledger
     GROUP BY member_id;



