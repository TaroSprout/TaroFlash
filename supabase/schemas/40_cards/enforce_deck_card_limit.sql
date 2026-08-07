-- Hand-organized declarative schema (by domain). Edit freely — this file is the
-- canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

-- Per-deck card cap. With ranks computed client-side the interactive card
-- writes are plain inserts/updates rather than RPCs, so this trigger pair is the
-- only thing standing between the table and an over-cap deck.
--
-- FOR EACH STATEMENT, not FOR EACH ROW: a bulk move is one UPDATE, and a
-- BEFORE ROW trigger's count(*) can't see rows changed by its own statement —
-- every row would read the same pre-move count, so a 400-card move into a
-- 400/500 deck would pass the check 400 times over. The transition tables let us
-- count the settled state once, after the whole statement has landed.
--
-- Raises PT402: the PT class is PostgREST's HTTP-status convention, so the
-- rejection also arrives at the client as a real 402 Payment Required.
CREATE FUNCTION public.assert_deck_card_limits(p_deck_ids bigint[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_limit int;
BEGIN
  IF COALESCE(array_length(p_deck_ids, 1), 0) = 0 THEN
    RETURN;
  END IF;

  SELECT p.cards_per_deck_limit
    INTO v_limit
    FROM public.members m
    JOIN public.plans   p ON p.id = m.plan
   WHERE m.id = auth.uid();

  -- Unlimited tier, or a caller with no member row (service-role backfills,
  -- seeds) → no cap to enforce.
  IF v_limit IS NULL THEN
    RETURN;
  END IF;

  PERFORM 1
     FROM public.cards c
    WHERE c.deck_id = ANY(p_deck_ids)
    GROUP BY c.deck_id
   HAVING count(*) > v_limit;

  IF FOUND THEN
    RAISE EXCEPTION 'deck_card_limit_exceeded'
      USING ERRCODE = 'PT402',
            DETAIL  = format('Plan allows max %s cards per deck', v_limit),
            HINT    = 'Upgrade the plan to raise the per-deck card cap';
  END IF;
END;
$$;


ALTER FUNCTION public.assert_deck_card_limits(p_deck_ids bigint[]) OWNER TO postgres;


GRANT ALL ON FUNCTION public.assert_deck_card_limits(p_deck_ids bigint[]) TO anon;
GRANT ALL ON FUNCTION public.assert_deck_card_limits(p_deck_ids bigint[]) TO authenticated;
GRANT ALL ON FUNCTION public.assert_deck_card_limits(p_deck_ids bigint[]) TO service_role;


CREATE FUNCTION public.enforce_deck_card_limit_on_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM public.assert_deck_card_limits(
    ARRAY(SELECT DISTINCT n.deck_id FROM new_rows n WHERE n.deck_id IS NOT NULL)
  );

  RETURN NULL;
END;
$$;


ALTER FUNCTION public.enforce_deck_card_limit_on_insert() OWNER TO postgres;


GRANT ALL ON FUNCTION public.enforce_deck_card_limit_on_insert() TO anon;
GRANT ALL ON FUNCTION public.enforce_deck_card_limit_on_insert() TO authenticated;
GRANT ALL ON FUNCTION public.enforce_deck_card_limit_on_insert() TO service_role;


-- Only decks a card actually landed in are checked. Postgres forbids
-- `AFTER UPDATE OF deck_id` alongside transition tables, so the "did the deck
-- change?" filter lives here instead. It matters: a member downgraded onto a
-- plan their existing deck already exceeds must still be able to edit that
-- deck's card text, and must still be able to move cards *out* of it.
CREATE FUNCTION public.enforce_deck_card_limit_on_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM public.assert_deck_card_limits(
    ARRAY(
      SELECT DISTINCT n.deck_id
        FROM new_rows n
        JOIN old_rows o ON o.id = n.id
       WHERE n.deck_id IS DISTINCT FROM o.deck_id
         AND n.deck_id IS NOT NULL
    )
  );

  RETURN NULL;
END;
$$;


ALTER FUNCTION public.enforce_deck_card_limit_on_update() OWNER TO postgres;


GRANT ALL ON FUNCTION public.enforce_deck_card_limit_on_update() TO anon;
GRANT ALL ON FUNCTION public.enforce_deck_card_limit_on_update() TO authenticated;
GRANT ALL ON FUNCTION public.enforce_deck_card_limit_on_update() TO service_role;


CREATE TRIGGER enforce_deck_card_limit_on_insert
    AFTER INSERT ON public.cards
    REFERENCING NEW TABLE AS new_rows
    FOR EACH STATEMENT EXECUTE FUNCTION public.enforce_deck_card_limit_on_insert();


CREATE TRIGGER enforce_deck_card_limit_on_update
    AFTER UPDATE ON public.cards
    REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows
    FOR EACH STATEMENT EXECUTE FUNCTION public.enforce_deck_card_limit_on_update();
