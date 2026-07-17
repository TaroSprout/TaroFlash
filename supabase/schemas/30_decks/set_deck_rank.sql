-- Hand-organized declarative schema (by domain). Edit freely — this file is the
-- canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.set_deck_rank() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  if new.rank is null then
    select coalesce(max(rank), 0) + 1000 into new.rank
    from public.decks
    where member_id = new.member_id;
  end if;
  return new;
end;
$$;


ALTER FUNCTION public.set_deck_rank() OWNER TO postgres;


GRANT ALL ON FUNCTION public.set_deck_rank() TO anon;
GRANT ALL ON FUNCTION public.set_deck_rank() TO authenticated;
GRANT ALL ON FUNCTION public.set_deck_rank() TO service_role;


CREATE TRIGGER set_rank_on_deck_insert BEFORE INSERT ON public.decks FOR EACH ROW EXECUTE FUNCTION public.set_deck_rank();
