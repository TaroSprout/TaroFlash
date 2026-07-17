-- Hand-organized declarative schema (by domain). Edit freely — this file is the
-- canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.bulk_insert_cards_in_deck(p_deck_id bigint, p_cards jsonb) RETURNS SETOF public.cards
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_max_rank numeric;
  v_step     numeric := 1000;
  v_rank     numeric;
  v_card     jsonb;
  v_inserted public.cards;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.decks
    WHERE public.decks.id = p_deck_id AND public.decks.member_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Deck not found or not owned by user';
  END IF;

  -- Plan-defined cap (fails fast before locking).
  PERFORM public.enforce_deck_card_limit(
    p_deck_id,
    COALESCE(jsonb_array_length(p_cards), 0)
  );

  PERFORM pg_advisory_xact_lock(p_deck_id);

  SELECT COALESCE(MAX(public.cards.rank), 0)
    INTO v_max_rank
    FROM public.cards
   WHERE public.cards.deck_id = p_deck_id;

  v_rank := v_max_rank;

  FOR v_card IN SELECT * FROM jsonb_array_elements(p_cards)
  LOOP
    v_rank := v_rank + v_step;

    INSERT INTO public.cards (member_id, deck_id, rank, front_text, back_text, note)
    VALUES (
      v_uid,
      p_deck_id,
      v_rank,
      COALESCE(v_card->>'front_text', ''),
      COALESCE(v_card->>'back_text', ''),
      v_card->>'note'
    )
    RETURNING * INTO v_inserted;

    RETURN NEXT v_inserted;
  END LOOP;
END;
$$;


ALTER FUNCTION public.bulk_insert_cards_in_deck(p_deck_id bigint, p_cards jsonb) OWNER TO postgres;


GRANT ALL ON FUNCTION public.bulk_insert_cards_in_deck(p_deck_id bigint, p_cards jsonb) TO anon;
GRANT ALL ON FUNCTION public.bulk_insert_cards_in_deck(p_deck_id bigint, p_cards jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.bulk_insert_cards_in_deck(p_deck_id bigint, p_cards jsonb) TO service_role;
