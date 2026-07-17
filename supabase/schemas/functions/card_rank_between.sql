-- Generated from pg_dump via scripts/dump-schemas; edit freely — this file is
-- the canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.card_rank_between(p_deck_id bigint, p_left_card_id bigint, p_right_card_id bigint) RETURNS numeric
    LANGUAGE plpgsql
    AS $$declare
  v_left_rank  numeric;
  v_right_rank numeric;
begin
  -- No neighbors (empty deck) -> choose some base rank
  if p_left_card_id is null and p_right_card_id is null then
    return 1000;
  end if;

  if p_left_card_id is not null then
    select c.rank
    into v_left_rank
    from public.cards c
    where c.id = p_left_card_id
      and c.deck_id = p_deck_id;
  end if;

  if p_right_card_id is not null then
    select c.rank
    into v_right_rank
    from public.cards c
    where c.id = p_right_card_id
      and c.deck_id = p_deck_id;
  end if;

  -- If both are still null, the deck has no cards matching those ids
  if v_left_rank is null and v_right_rank is null then
    raise exception 'card_rank_between: neither left nor right card found for deck %', p_deck_id;
  end if;

  -- Insert at start: only right neighbor
  if v_left_rank is null then
    return v_right_rank - 1;
  end if;

  -- Insert at end: only left neighbor
  if v_right_rank is null then
    return v_left_rank + 1;
  end if;

  if v_left_rank >= v_right_rank then
    raise exception using
      message = 'CARD_RANK_INVALID_ORDER',
      errcode = 'P0001';  -- user-defined / generic error code class
  end if;

  return (v_left_rank + v_right_rank) / 2;
end;$$;


ALTER FUNCTION public.card_rank_between(p_deck_id bigint, p_left_card_id bigint, p_right_card_id bigint) OWNER TO postgres;


GRANT ALL ON FUNCTION public.card_rank_between(p_deck_id bigint, p_left_card_id bigint, p_right_card_id bigint) TO anon;
GRANT ALL ON FUNCTION public.card_rank_between(p_deck_id bigint, p_left_card_id bigint, p_right_card_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.card_rank_between(p_deck_id bigint, p_left_card_id bigint, p_right_card_id bigint) TO service_role;

