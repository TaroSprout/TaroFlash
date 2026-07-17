-- Hand-organized declarative schema (by domain). Edit freely — this file is the
-- canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.reserve_card(p_deck_id bigint, p_left_card_id bigint, p_right_card_id bigint) RETURNS TABLE(out_id bigint, out_rank numeric)
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_rank  numeric;
  v_uid   uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify the caller owns the deck
  IF NOT EXISTS (
    SELECT 1 FROM public.decks
    WHERE id = p_deck_id AND member_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Deck not found or not owned by user';
  END IF;

  -- Serialize within this deck to avoid rank races
  PERFORM pg_advisory_xact_lock(p_deck_id);

  BEGIN
    v_rank := public.card_rank_between(p_deck_id, p_left_card_id, p_right_card_id);
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      PERFORM public.reindex_deck_ranks(p_deck_id);
      v_rank := public.card_rank_between(p_deck_id, p_left_card_id, p_right_card_id);
    WHEN OTHERS THEN
      RAISE;
  END;

  INSERT INTO public.cards (member_id, deck_id, rank, front_text, back_text)
  VALUES (v_uid, p_deck_id, v_rank, '', '')
  RETURNING public.cards.id, public.cards.rank
  INTO out_id, out_rank;

  RETURN NEXT;
  RETURN;
END;
$$;


ALTER FUNCTION public.reserve_card(p_deck_id bigint, p_left_card_id bigint, p_right_card_id bigint) OWNER TO postgres;


GRANT ALL ON FUNCTION public.reserve_card(p_deck_id bigint, p_left_card_id bigint, p_right_card_id bigint) TO anon;
GRANT ALL ON FUNCTION public.reserve_card(p_deck_id bigint, p_left_card_id bigint, p_right_card_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.reserve_card(p_deck_id bigint, p_left_card_id bigint, p_right_card_id bigint) TO service_role;
