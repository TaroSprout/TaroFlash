-- Hand-organized declarative schema (by domain). Edit freely — this file is the
-- canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

-- the unique ledger constraint, not this function, is what makes a repeat
-- call for the same occasion a no-op →[K:occasion-reward-pays-once]
CREATE FUNCTION public.credit_occasion_reward(p_member uuid, p_rule_key text, p_occasion_ref text, p_count bigint) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
    jsonb_build_array(jsonb_build_object('kind', 'paperclips', 'amount', v_amount)),
    v_grant
  );
END;
$$;


ALTER FUNCTION public.credit_occasion_reward(p_member uuid, p_rule_key text, p_occasion_ref text, p_count bigint) OWNER TO postgres;


REVOKE ALL ON FUNCTION public.credit_occasion_reward(p_member uuid, p_rule_key text, p_occasion_ref text, p_count bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.credit_occasion_reward(p_member uuid, p_rule_key text, p_occasion_ref text, p_count bigint) FROM anon;
REVOKE ALL ON FUNCTION public.credit_occasion_reward(p_member uuid, p_rule_key text, p_occasion_ref text, p_count bigint) FROM authenticated;
GRANT ALL ON FUNCTION public.credit_occasion_reward(p_member uuid, p_rule_key text, p_occasion_ref text, p_count bigint) TO service_role;
