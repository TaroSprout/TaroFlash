-- Hand-organized declarative schema (by domain). Edit freely — this file is the
-- canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

-- Batched deck reassignment. The client computes the destination keys (one per
-- card, in the order they should land) and hands them in alongside the ids —
-- this function only owns ownership checks and the write, so a queued offline
-- move carries everything it needs in its payload.
--
-- Kept as an RPC purely because PostgREST has no way to give each row of a bulk
-- update its own value; `upsert` would fabricate blank cards for any id that
-- didn't exist. The per-deck cap is enforced by the trigger on `cards`.
CREATE FUNCTION public.move_cards_to_deck(p_target_deck_id bigint, p_card_ids bigint[], p_ranks text[]) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_count int  := COALESCE(array_length(p_card_ids, 1), 0);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'No cards to move';
  END IF;

  IF v_count <> COALESCE(array_length(p_ranks, 1), 0) THEN
    RAISE EXCEPTION 'p_card_ids and p_ranks must be the same length';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.decks
     WHERE public.decks.id = p_target_deck_id AND public.decks.member_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Target deck not found or not owned by user';
  END IF;

  -- One count covers both "not yours" and "doesn't exist", matching the error
  -- surface the rest of this RPC family presents.
  IF (
    SELECT count(*) FROM public.cards
     WHERE public.cards.id = ANY(p_card_ids)
       AND public.cards.member_id = v_uid
  ) <> v_count THEN
    RAISE EXCEPTION 'One or more cards are not movable to this deck';
  END IF;

  UPDATE public.cards AS c
     SET deck_id    = p_target_deck_id,
         rank       = m.rank,
         updated_at = now()
    FROM unnest(p_card_ids, p_ranks) AS m(card_id, rank)
   WHERE c.id = m.card_id;
END;
$$;


ALTER FUNCTION public.move_cards_to_deck(p_target_deck_id bigint, p_card_ids bigint[], p_ranks text[]) OWNER TO postgres;


GRANT ALL ON FUNCTION public.move_cards_to_deck(p_target_deck_id bigint, p_card_ids bigint[], p_ranks text[]) TO anon;
GRANT ALL ON FUNCTION public.move_cards_to_deck(p_target_deck_id bigint, p_card_ids bigint[], p_ranks text[]) TO authenticated;
GRANT ALL ON FUNCTION public.move_cards_to_deck(p_target_deck_id bigint, p_card_ids bigint[], p_ranks text[]) TO service_role;
