-- knowledge: get_session_earnings — corpus/rewards/rewards.md

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_session_earnings(p_session_id uuid)
 RETURNS TABLE(earned bigint, balance bigint)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT
    COALESCE((
      SELECT pl.amount
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

ALTER FUNCTION public.get_session_earnings(p_session_id uuid) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.get_session_earnings(p_session_id uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_session_earnings(p_session_id uuid) FROM anon;
GRANT ALL ON FUNCTION public.get_session_earnings(p_session_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_session_earnings(p_session_id uuid) TO service_role;
