-- Hand-organized declarative schema (by domain). Edit freely — this file is the
-- canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.insert_card_at(p_deck_id bigint, p_anchor_id bigint, p_side text, p_front_text text, p_back_text text, p_note text DEFAULT NULL::text) RETURNS TABLE(id bigint, rank numeric)
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_uid         uuid    := auth.uid();
  v_anchor_rank numeric;
  v_left_id     bigint;
  v_right_id    bigint;
  v_rank        numeric;
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

  IF p_anchor_id IS NOT NULL AND (p_side IS NULL OR p_side NOT IN ('before', 'after')) THEN
    RAISE EXCEPTION 'Invalid side %, expected ''before'' or ''after''', p_side;
  END IF;

  -- Plan-defined cap (fails fast before locking).
  PERFORM public.enforce_deck_card_limit(p_deck_id, 1);

  IF p_anchor_id IS NOT NULL THEN
    SELECT public.cards.rank
      INTO v_anchor_rank
      FROM public.cards
     WHERE public.cards.id      = p_anchor_id
       AND public.cards.deck_id = p_deck_id;

    IF v_anchor_rank IS NULL THEN
      RAISE EXCEPTION 'Anchor card % not found in deck %', p_anchor_id, p_deck_id;
    END IF;

    IF p_side = 'after' THEN
      v_left_id := p_anchor_id;
      SELECT public.cards.id
        INTO v_right_id
        FROM public.cards
       WHERE public.cards.deck_id = p_deck_id
         AND public.cards.rank    > v_anchor_rank
       ORDER BY public.cards.rank ASC
       LIMIT 1;
    ELSE
      v_right_id := p_anchor_id;
      SELECT public.cards.id
        INTO v_left_id
        FROM public.cards
       WHERE public.cards.deck_id = p_deck_id
         AND public.cards.rank    < v_anchor_rank
       ORDER BY public.cards.rank DESC
       LIMIT 1;
    END IF;
  END IF;

  PERFORM pg_advisory_xact_lock(p_deck_id);

  BEGIN
    v_rank := public.card_rank_between(p_deck_id, v_left_id, v_right_id);
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      PERFORM public.reindex_deck_ranks(p_deck_id);
      v_rank := public.card_rank_between(p_deck_id, v_left_id, v_right_id);
  END;

  INSERT INTO public.cards (member_id, deck_id, rank, front_text, back_text, note)
  VALUES (
    v_uid,
    p_deck_id,
    v_rank,
    COALESCE(p_front_text, ''),
    COALESCE(p_back_text, ''),
    p_note
  )
  RETURNING public.cards.id, public.cards.rank
  INTO id, rank;

  RETURN NEXT;
END;
$$;


ALTER FUNCTION public.insert_card_at(p_deck_id bigint, p_anchor_id bigint, p_side text, p_front_text text, p_back_text text, p_note text) OWNER TO postgres;


GRANT ALL ON FUNCTION public.insert_card_at(p_deck_id bigint, p_anchor_id bigint, p_side text, p_front_text text, p_back_text text, p_note text) TO anon;
GRANT ALL ON FUNCTION public.insert_card_at(p_deck_id bigint, p_anchor_id bigint, p_side text, p_front_text text, p_back_text text, p_note text) TO authenticated;
GRANT ALL ON FUNCTION public.insert_card_at(p_deck_id bigint, p_anchor_id bigint, p_side text, p_front_text text, p_back_text text, p_note text) TO service_role;
