-- Generated from pg_dump via scripts/dump-schemas; edit freely — this file is
-- the canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.reindex_deck_ranks(p_deck_id bigint) RETURNS void
    LANGUAGE plpgsql
    AS $$
declare
  v_step numeric := 1000;  -- spacing between ranks
begin
  with ordered as (
    select
      id,
      row_number() over (order by rank, id) as rn
    from public.cards
    where deck_id = p_deck_id
  )
  update public.cards c
  set rank = o.rn * v_step
  from ordered o
  where c.id = o.id;
end;
$$;


ALTER FUNCTION public.reindex_deck_ranks(p_deck_id bigint) OWNER TO postgres;


GRANT ALL ON FUNCTION public.reindex_deck_ranks(p_deck_id bigint) TO anon;
GRANT ALL ON FUNCTION public.reindex_deck_ranks(p_deck_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.reindex_deck_ranks(p_deck_id bigint) TO service_role;

