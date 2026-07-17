-- Hand-organized declarative schema (by domain). Edit freely — this file is the
-- canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.move_cards_to_deck(p_target_deck_id bigint, p_card_ids bigint[] DEFAULT NULL::bigint[], p_source_deck_id bigint DEFAULT NULL::bigint, p_except_ids bigint[] DEFAULT NULL::bigint[]) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_uid          uuid    := auth.uid();
  v_mode         text;
  v_moving_count int;
  v_max_rank     numeric;
  v_step         numeric := 1000;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Dispatch: exactly one of p_card_ids / p_source_deck_id must be set.
  IF p_card_ids IS NOT NULL AND p_source_deck_id IS NULL THEN
    v_mode := 'explicit';
  ELSIF p_source_deck_id IS NOT NULL AND p_card_ids IS NULL THEN
    v_mode := 'select_all';
  ELSE
    RAISE EXCEPTION 'Pass exactly one of p_card_ids or p_source_deck_id';
  END IF;

  -- Target deck ownership (both modes).
  IF NOT EXISTS (
    SELECT 1 FROM public.decks
     WHERE public.decks.id = p_target_deck_id AND public.decks.member_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Target deck not found or not owned by user';
  END IF;

  IF v_mode = 'explicit' THEN
    v_moving_count := COALESCE(array_length(p_card_ids, 1), 0);

    IF v_moving_count = 0 THEN
      RAISE EXCEPTION 'No cards to move';
    END IF;

    -- Ownership + reject same-deck moves in one EXISTS.
    IF EXISTS (
      SELECT 1 FROM public.cards
       WHERE public.cards.id = ANY(p_card_ids)
         AND (
           public.cards.member_id <> v_uid
           OR public.cards.deck_id = p_target_deck_id
         )
    ) THEN
      RAISE EXCEPTION 'One or more cards are not movable to this deck';
    END IF;

    -- Catches missing IDs (the EXISTS above passes vacuously for them).
    IF (
      SELECT count(*) FROM public.cards
       WHERE public.cards.id = ANY(p_card_ids)
         AND public.cards.member_id = v_uid
    ) <> v_moving_count THEN
      RAISE EXCEPTION 'One or more cards not found';
    END IF;
  ELSE
    -- Source deck ownership + same-deck guard.
    IF NOT EXISTS (
      SELECT 1 FROM public.decks
       WHERE public.decks.id = p_source_deck_id AND public.decks.member_id = v_uid
    ) THEN
      RAISE EXCEPTION 'Source deck not found or not owned by user';
    END IF;

    IF p_source_deck_id = p_target_deck_id THEN
      RAISE EXCEPTION 'Source and target decks must differ';
    END IF;

    -- NULL/empty except_ids = move every card in source. The
    -- `id <> ALL(NULL)` evaluates to NULL → guard explicitly, same trick as
    -- delete_cards_in_deck.
    SELECT count(*) INTO v_moving_count
      FROM public.cards
     WHERE public.cards.deck_id = p_source_deck_id
       AND (p_except_ids IS NULL OR public.cards.id <> ALL(p_except_ids));

    IF v_moving_count = 0 THEN
      RAISE EXCEPTION 'No cards to move';
    END IF;
  END IF;

  -- Plan-defined cap on the target deck.
  PERFORM public.enforce_deck_card_limit(p_target_deck_id, v_moving_count);

  -- Lock target deck against concurrent insert/move racing the tail slot.
  -- Source deck doesn't need a lock — rows leaving don't affect any other
  -- rank computation there.
  PERFORM pg_advisory_xact_lock(p_target_deck_id);

  SELECT COALESCE(MAX(public.cards.rank), 0)
    INTO v_max_rank
    FROM public.cards
   WHERE public.cards.deck_id = p_target_deck_id;

  IF v_mode = 'explicit' THEN
    UPDATE public.cards AS c
       SET deck_id    = p_target_deck_id,
           rank       = v_max_rank + (ord.idx * v_step),
           updated_at = now()
      FROM unnest(p_card_ids) WITH ORDINALITY AS ord(card_id, idx)
     WHERE c.id = ord.card_id;
  ELSE
    -- Preserve source-deck visual order via rank-based ROW_NUMBER.
    WITH ordered AS (
      SELECT public.cards.id,
             row_number() OVER (ORDER BY public.cards.rank) AS idx
        FROM public.cards
       WHERE public.cards.deck_id = p_source_deck_id
         AND (p_except_ids IS NULL OR public.cards.id <> ALL(p_except_ids))
    )
    UPDATE public.cards AS c
       SET deck_id    = p_target_deck_id,
           rank       = v_max_rank + (ordered.idx * v_step),
           updated_at = now()
      FROM ordered
     WHERE c.id = ordered.id;
  END IF;
END;
$$;


ALTER FUNCTION public.move_cards_to_deck(p_target_deck_id bigint, p_card_ids bigint[], p_source_deck_id bigint, p_except_ids bigint[]) OWNER TO postgres;


GRANT ALL ON FUNCTION public.move_cards_to_deck(p_target_deck_id bigint, p_card_ids bigint[], p_source_deck_id bigint, p_except_ids bigint[]) TO anon;
GRANT ALL ON FUNCTION public.move_cards_to_deck(p_target_deck_id bigint, p_card_ids bigint[], p_source_deck_id bigint, p_except_ids bigint[]) TO authenticated;
GRANT ALL ON FUNCTION public.move_cards_to_deck(p_target_deck_id bigint, p_card_ids bigint[], p_source_deck_id bigint, p_except_ids bigint[]) TO service_role;
