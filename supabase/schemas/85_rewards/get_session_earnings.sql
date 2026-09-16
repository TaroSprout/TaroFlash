-- Hand-organized declarative schema (by domain). Edit freely — this file is the
-- canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

-- No SECURITY DEFINER — runs as the caller, so the existing per-member SELECT
-- policies on paperclip_ledger, member_rewards and paperclip_balance are what
-- scope this to the caller's own rows, same as any other client read.
CREATE FUNCTION public.get_session_earnings(p_session_id uuid) RETURNS TABLE(base numeric, bonus numeric, balance numeric)
    LANGUAGE sql STABLE
    AS $$
  SELECT
    round(COALESCE((
      SELECT sum(pl.amount)
        FROM public.paperclip_ledger pl
        JOIN public.member_rewards mr ON mr.id = pl.member_reward_id
        JOIN public.reward_rules rr ON rr.id = mr.reward_rule_id
       WHERE mr.member_id = public.active_member_id()
         AND rr.key = 'study.session_completion_bonus'
         AND mr.occasion_ref = p_session_id::text
         AND pl.source = 'session_base'
    ), 0) / 1000.0, 3) AS base,
    round(COALESCE((
      SELECT sum(pl.amount)
        FROM public.paperclip_ledger pl
        JOIN public.member_rewards mr ON mr.id = pl.member_reward_id
        JOIN public.reward_rules rr ON rr.id = mr.reward_rule_id
       WHERE mr.member_id = public.active_member_id()
         AND rr.key = 'study.session_completion_bonus'
         AND mr.occasion_ref = p_session_id::text
         AND pl.source = 'session_bonus'
    ), 0) / 1000.0, 3) AS bonus,
    round(COALESCE((
      SELECT sum(pl.amount)
        FROM public.paperclip_ledger pl
       WHERE pl.member_id = public.active_member_id()
    ), 0) / 1000.0, 3) AS balance;
$$;


ALTER FUNCTION public.get_session_earnings(p_session_id uuid) OWNER TO postgres;


REVOKE ALL ON FUNCTION public.get_session_earnings(p_session_id uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_session_earnings(p_session_id uuid) FROM anon;
GRANT ALL ON FUNCTION public.get_session_earnings(p_session_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_session_earnings(p_session_id uuid) TO service_role;
