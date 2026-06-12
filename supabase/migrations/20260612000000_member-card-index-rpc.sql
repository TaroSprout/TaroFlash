-- get_member_card_index: one row per distinct card front, with the decks that hold it.
-- Powers inline card-match highlighting in the audio reader. Front-only by design.

CREATE OR REPLACE FUNCTION public.get_member_card_index(p_member_id uuid)
 RETURNS TABLE(term text, deck_ids bigint[])
 LANGUAGE sql
 STABLE
AS $function$
  select
    c.front_text as term,
    array_agg(distinct c.deck_id) as deck_ids
  from public.cards c
  where c.member_id = p_member_id
    and c.front_text is not null
    and length(trim(c.front_text)) > 0
  group by c.front_text;
$function$
;
