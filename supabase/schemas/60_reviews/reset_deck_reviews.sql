-- Hand-organized declarative schema (by domain). Edit freely — this file is the
-- canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.reset_deck_reviews(p_deck_id bigint) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_uid uuid := auth.uid();
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

  DELETE FROM public.review_logs
   WHERE card_id IN (SELECT id FROM public.cards WHERE deck_id = p_deck_id);

  DELETE FROM public.reviews
   WHERE card_id IN (SELECT id FROM public.cards WHERE deck_id = p_deck_id);
END;
$$;


ALTER FUNCTION public.reset_deck_reviews(p_deck_id bigint) OWNER TO postgres;


GRANT ALL ON FUNCTION public.reset_deck_reviews(p_deck_id bigint) TO anon;
GRANT ALL ON FUNCTION public.reset_deck_reviews(p_deck_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.reset_deck_reviews(p_deck_id bigint) TO service_role;
