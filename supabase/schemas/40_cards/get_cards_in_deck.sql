-- Hand-organized declarative schema (by domain). Edit freely — this file is the
-- canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.get_cards_in_deck(p_deck_id bigint, p_sort_by text DEFAULT 'default'::text, p_query text DEFAULT NULL::text, p_offset integer DEFAULT 0, p_limit integer DEFAULT 50) RETURNS TABLE(id bigint, created_at timestamp with time zone, updated_at timestamp with time zone, front_text text, back_text text, deck_id bigint, member_id uuid, rank numeric, front_image_bucket text, front_image_path text, back_image_bucket text, back_image_path text, review jsonb)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    cwi.id,
    cwi.created_at,
    cwi.updated_at,
    cwi.front_text,
    cwi.back_text,
    cwi.deck_id,
    cwi.member_id,
    cwi.rank,
    cwi.front_image_bucket,
    cwi.front_image_path,
    cwi.back_image_bucket,
    cwi.back_image_path,
    -- Return NULL (not an all-null object) when no review row exists.
    CASE WHEN r.id IS NOT NULL THEN to_jsonb(r.*) END AS review
  FROM public.cards_with_images cwi
  LEFT JOIN public.reviews r ON r.card_id = cwi.id
  WHERE cwi.deck_id = p_deck_id
    AND (
      p_query IS NULL
      OR cwi.front_text ILIKE '%' || p_query || '%'
      OR cwi.back_text  ILIKE '%' || p_query || '%'
    )
  ORDER BY
    -- When p_sort_by = 'difficulty', sort by it DESC; cards with no review row
    -- (NULL difficulty) sink to the bottom via NULLS LAST. For all other values
    -- of p_sort_by this expression evaluates to NULL for every row, making it a
    -- no-op and falling through to the rank/id columns below.
    CASE WHEN p_sort_by = 'difficulty' THEN r.difficulty END DESC NULLS LAST,
    cwi.rank ASC,
    cwi.id   ASC
  OFFSET p_offset
  LIMIT  p_limit;
END;
$$;


ALTER FUNCTION public.get_cards_in_deck(p_deck_id bigint, p_sort_by text, p_query text, p_offset integer, p_limit integer) OWNER TO postgres;


GRANT ALL ON FUNCTION public.get_cards_in_deck(p_deck_id bigint, p_sort_by text, p_query text, p_offset integer, p_limit integer) TO anon;
GRANT ALL ON FUNCTION public.get_cards_in_deck(p_deck_id bigint, p_sort_by text, p_query text, p_offset integer, p_limit integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_cards_in_deck(p_deck_id bigint, p_sort_by text, p_query text, p_offset integer, p_limit integer) TO service_role;
