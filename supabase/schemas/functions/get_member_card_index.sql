-- Generated from pg_dump via scripts/dump-schemas; edit freely — this file is
-- the canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.get_member_card_index(p_member_id uuid) RETURNS TABLE(term text, deck_ids bigint[])
    LANGUAGE sql STABLE
    AS $$
  select
    c.front_text as term,
    array_agg(distinct c.deck_id) as deck_ids
  from public.cards c
  where c.member_id = p_member_id
    and c.front_text is not null
    and length(trim(c.front_text)) > 0
  group by c.front_text;
$$;


ALTER FUNCTION public.get_member_card_index(p_member_id uuid) OWNER TO postgres;


GRANT ALL ON FUNCTION public.get_member_card_index(p_member_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_member_card_index(p_member_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_member_card_index(p_member_id uuid) TO service_role;

