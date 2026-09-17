-- knowledge: apply_reward — corpus/rewards/rewards.md

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
      VALUES (p_member, (v_reward ->> 'amount')::bigint, COALESCE(v_reward ->> 'source', 'milestone'), p_member_reward);
    ELSE
      RAISE EXCEPTION 'Unknown reward kind: %', v_kind;
    END IF;
  END LOOP;
END;
$function$
;


