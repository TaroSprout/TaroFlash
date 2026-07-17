-- Hand-organized declarative schema (by domain). Edit freely — this file is the
-- canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.delete_cards_in_deck(p_deck_id bigint, p_except_ids bigint[]) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_uid           uuid := auth.uid();
  v_deleted_count integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Ownership check on the deck — implies ownership of all cards in it
  -- (cards.member_id is enforced equal to decks.member_id by the RLS policy
  -- on insert / by data invariants).
  IF NOT EXISTS (
    SELECT 1 FROM public.decks
    WHERE public.decks.id = p_deck_id AND public.decks.member_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Deck not found or not owned by user';
  END IF;

  -- Guard the NULL case explicitly: `id <> ALL(NULL)` evaluates to NULL,
  -- which falls out of the WHERE filter and would skip every row. Treating
  -- NULL the same as "no exceptions" matches the intuitive call shape.
  DELETE FROM public.cards
   WHERE public.cards.deck_id = p_deck_id
     AND (p_except_ids IS NULL OR public.cards.id <> ALL(p_except_ids));

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;


ALTER FUNCTION public.delete_cards_in_deck(p_deck_id bigint, p_except_ids bigint[]) OWNER TO postgres;


GRANT ALL ON FUNCTION public.delete_cards_in_deck(p_deck_id bigint, p_except_ids bigint[]) TO anon;
GRANT ALL ON FUNCTION public.delete_cards_in_deck(p_deck_id bigint, p_except_ids bigint[]) TO authenticated;
GRANT ALL ON FUNCTION public.delete_cards_in_deck(p_deck_id bigint, p_except_ids bigint[]) TO service_role;
