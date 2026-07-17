-- Hand-organized declarative schema (by domain). Edit freely — this file is the
-- canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.reindex_member_deck_ranks(p_member_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_step numeric := 1000;
BEGIN
  WITH ordered AS (
    SELECT id, row_number() OVER (ORDER BY rank, id) AS rn
      FROM public.decks
     WHERE member_id = p_member_id
  )
  UPDATE public.decks d
     SET rank = o.rn * v_step
    FROM ordered o
   WHERE d.id = o.id;
END;
$$;


ALTER FUNCTION public.reindex_member_deck_ranks(p_member_id uuid) OWNER TO postgres;


GRANT ALL ON FUNCTION public.reindex_member_deck_ranks(p_member_id uuid) TO anon;
GRANT ALL ON FUNCTION public.reindex_member_deck_ranks(p_member_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.reindex_member_deck_ranks(p_member_id uuid) TO service_role;
