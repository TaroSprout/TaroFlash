-- Generated from pg_dump via scripts/dump-schemas; edit freely — this file is
-- the canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.deck_rank_between(p_member_id uuid, p_left_deck_id bigint, p_right_deck_id bigint) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
DECLARE
  l_rank numeric;
  r_rank numeric;
BEGIN
  IF p_left_deck_id IS NOT NULL THEN
    SELECT rank INTO l_rank
      FROM public.decks
     WHERE id = p_left_deck_id AND member_id = p_member_id;
  END IF;

  IF p_right_deck_id IS NOT NULL THEN
    SELECT rank INTO r_rank
      FROM public.decks
     WHERE id = p_right_deck_id AND member_id = p_member_id;
  END IF;

  IF l_rank IS NULL AND r_rank IS NULL THEN
    RETURN 1000;
  ELSIF l_rank IS NULL THEN
    RETURN r_rank - 1;
  ELSIF r_rank IS NULL THEN
    RETURN l_rank + 1;
  ELSE
    IF l_rank >= r_rank THEN
      RAISE EXCEPTION 'Invalid neighbor ordering: left(%) >= right(%)', l_rank, r_rank;
    END IF;
    RETURN (l_rank + r_rank) / 2.0;
  END IF;
END;
$$;


ALTER FUNCTION public.deck_rank_between(p_member_id uuid, p_left_deck_id bigint, p_right_deck_id bigint) OWNER TO postgres;


GRANT ALL ON FUNCTION public.deck_rank_between(p_member_id uuid, p_left_deck_id bigint, p_right_deck_id bigint) TO anon;
GRANT ALL ON FUNCTION public.deck_rank_between(p_member_id uuid, p_left_deck_id bigint, p_right_deck_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.deck_rank_between(p_member_id uuid, p_left_deck_id bigint, p_right_deck_id bigint) TO service_role;

