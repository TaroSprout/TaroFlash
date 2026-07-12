-- =============================================================================
-- decks.rank was made NOT NULL with no default, but deck creation inserts a
-- plain row with no rank (unlike cards, a new deck has no anchor to resolve —
-- it always lands at the end). Auto-fill it on insert with a BEFORE INSERT
-- trigger, same mechanism as set_member_id() below.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.set_deck_rank()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  if new.rank is null then
    select coalesce(max(rank), 0) + 1000 into new.rank
    from public.decks
    where member_id = new.member_id;
  end if;
  return new;
end;
$function$
;

-- Postgres runs same-timing triggers in alphabetical order by name — this
-- must sort after "set_member_id_on_deck" so new.member_id is already
-- populated by the time this one reads it below.
CREATE TRIGGER set_rank_on_deck_insert BEFORE INSERT ON public.decks FOR EACH ROW EXECUTE FUNCTION public.set_deck_rank();

COMMIT;
