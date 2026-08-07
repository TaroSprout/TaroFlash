-- Hand-organized declarative schema (by domain). Edit freely — this file is the
-- canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

-- Batched deck reassignment, split down the middle: the client mints the keys,
-- the server decides which cards get them.
--
-- `p_ranks` is a run of ascending keys sitting after the target deck's last
-- card. The server pairs them with the cards it resolves, in the source's own
-- `(rank, id)` order, so a moved selection keeps its relative order. Extra keys
-- are ignored — the caller is allowed to send an upper bound rather than pay for
-- an exact count first.
--
-- Still an RPC for two reasons: PostgREST can't give each row of a bulk update
-- its own value, and resolving "every card in this deck" client-side would mean
-- paging the ids back out past the `max_rows` cap just to send them straight
-- back. The per-deck cap is enforced by the trigger on `cards`.
CREATE FUNCTION public.move_cards_to_deck(p_target_deck_id bigint, p_ranks text[], p_card_ids bigint[] DEFAULT NULL::bigint[], p_source_deck_id bigint DEFAULT NULL::bigint, p_except_ids bigint[] DEFAULT NULL::bigint[]) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_mode   text;
  v_ids    bigint[];
  v_moving int;
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
    -- One count covers both "not yours" and "doesn't exist", matching the error
    -- surface the rest of this RPC family presents.
    IF (
      SELECT count(*) FROM public.cards
       WHERE public.cards.id = ANY(p_card_ids)
         AND public.cards.member_id = v_uid
    ) <> COALESCE(array_length(p_card_ids, 1), 0) THEN
      RAISE EXCEPTION 'One or more cards are not movable to this deck';
    END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM public.decks
       WHERE public.decks.id = p_source_deck_id AND public.decks.member_id = v_uid
    ) THEN
      RAISE EXCEPTION 'Source deck not found or not owned by user';
    END IF;

    IF p_source_deck_id = p_target_deck_id THEN
      RAISE EXCEPTION 'Source and target decks must differ';
    END IF;
  END IF;

  -- The cards that will actually move, in the order they should land. Cards
  -- already sitting in the target are excluded rather than re-keyed, so a mixed
  -- selection leaves those exactly where they are. `id <> ALL(NULL)` evaluates
  -- to NULL, so the empty p_except_ids case is guarded explicitly — the same
  -- trick as delete_cards_in_deck.
  SELECT array_agg(c.id ORDER BY c.rank, c.id)
    INTO v_ids
    FROM public.cards c
   WHERE c.deck_id <> p_target_deck_id
     AND c.member_id = v_uid
     AND (
       CASE v_mode
         WHEN 'explicit' THEN c.id = ANY(p_card_ids)
         ELSE c.deck_id = p_source_deck_id
              AND (p_except_ids IS NULL OR c.id <> ALL(p_except_ids))
       END
     );

  v_moving := COALESCE(array_length(v_ids, 1), 0);

  -- Every selected card was already home. The caller did ask to move real,
  -- owned cards, so this is a no-op rather than an error.
  IF v_moving = 0 THEN
    RETURN;
  END IF;

  -- Too few keys means the deck grew between the caller sizing the run and this
  -- statement. Fail loudly: assigning a NULL rank would trip the NOT NULL
  -- constraint with a far less obvious message.
  IF v_moving > COALESCE(array_length(p_ranks, 1), 0) THEN
    RAISE EXCEPTION 'Got % ranks for % cards', COALESCE(array_length(p_ranks, 1), 0), v_moving;
  END IF;

  UPDATE public.cards AS c
     SET deck_id    = p_target_deck_id,
         rank       = p_ranks[ord.idx],
         updated_at = now()
    FROM unnest(v_ids) WITH ORDINALITY AS ord(card_id, idx)
   WHERE c.id = ord.card_id;
END;
$$;


ALTER FUNCTION public.move_cards_to_deck(p_target_deck_id bigint, p_ranks text[], p_card_ids bigint[], p_source_deck_id bigint, p_except_ids bigint[]) OWNER TO postgres;


GRANT ALL ON FUNCTION public.move_cards_to_deck(p_target_deck_id bigint, p_ranks text[], p_card_ids bigint[], p_source_deck_id bigint, p_except_ids bigint[]) TO anon;
GRANT ALL ON FUNCTION public.move_cards_to_deck(p_target_deck_id bigint, p_ranks text[], p_card_ids bigint[], p_source_deck_id bigint, p_except_ids bigint[]) TO authenticated;
GRANT ALL ON FUNCTION public.move_cards_to_deck(p_target_deck_id bigint, p_ranks text[], p_card_ids bigint[], p_source_deck_id bigint, p_except_ids bigint[]) TO service_role;
