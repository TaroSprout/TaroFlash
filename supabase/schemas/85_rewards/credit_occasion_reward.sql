-- Hand-organized declarative schema (by domain). Edit freely — this file is the
-- canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

-- the unique ledger constraint, not this function, is what makes a repeat
-- call for the same occasion a no-op →[K:occasion-reward-pays-once]
CREATE FUNCTION public.credit_occasion_reward(p_member uuid, p_rule_key text, p_occasion_ref text, p_correct_count bigint, p_difficulty_factor numeric) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.credit_occasion_reward(p_member uuid, p_rule_key text, p_occasion_ref text, p_correct_count bigint, p_difficulty_factor numeric) OWNER TO postgres;


REVOKE ALL ON FUNCTION public.credit_occasion_reward(p_member uuid, p_rule_key text, p_occasion_ref text, p_correct_count bigint, p_difficulty_factor numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.credit_occasion_reward(p_member uuid, p_rule_key text, p_occasion_ref text, p_correct_count bigint, p_difficulty_factor numeric) FROM anon;
REVOKE ALL ON FUNCTION public.credit_occasion_reward(p_member uuid, p_rule_key text, p_occasion_ref text, p_correct_count bigint, p_difficulty_factor numeric) FROM authenticated;
GRANT ALL ON FUNCTION public.credit_occasion_reward(p_member uuid, p_rule_key text, p_occasion_ref text, p_correct_count bigint, p_difficulty_factor numeric) TO service_role;
