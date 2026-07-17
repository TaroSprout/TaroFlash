-- Hand-organized declarative schema (by domain). Edit freely — this file is the
-- canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.enforce_deck_card_limit(p_deck_id bigint, p_adding integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_limit int;
  v_count int;
BEGIN
  SELECT p.cards_per_deck_limit
    INTO v_limit
    FROM public.members m
    JOIN public.plans   p ON p.id = m.plan
   WHERE m.id = auth.uid();

  -- Unlimited tier or unknown caller → no-op. (Auth is enforced by the
  -- calling RPC; this helper stays narrow.)
  IF v_limit IS NULL THEN
    RETURN;
  END IF;

  SELECT count(*) INTO v_count
    FROM public.cards
   WHERE public.cards.deck_id = p_deck_id;

  IF v_count + p_adding > v_limit THEN
    RAISE EXCEPTION 'deck_card_limit_exceeded'
      USING ERRCODE = 'PT402',
            DETAIL  = format('Plan allows max %s cards per deck', v_limit),
            HINT    = 'Upgrade the plan to raise the per-deck card cap';
  END IF;
END;
$$;


ALTER FUNCTION public.enforce_deck_card_limit(p_deck_id bigint, p_adding integer) OWNER TO postgres;


GRANT ALL ON FUNCTION public.enforce_deck_card_limit(p_deck_id bigint, p_adding integer) TO anon;
GRANT ALL ON FUNCTION public.enforce_deck_card_limit(p_deck_id bigint, p_adding integer) TO authenticated;
GRANT ALL ON FUNCTION public.enforce_deck_card_limit(p_deck_id bigint, p_adding integer) TO service_role;
