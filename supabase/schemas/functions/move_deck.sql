-- Generated from pg_dump via scripts/dump-schemas; edit freely — this file is
-- the canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

CREATE FUNCTION public.move_deck(p_deck_id bigint, p_anchor_id bigint, p_side text) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_uid         uuid := auth.uid();
  v_anchor_rank numeric;
  v_left_id     bigint;
  v_right_id    bigint;
  v_rank        numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_deck_id = p_anchor_id THEN
    RAISE EXCEPTION 'Cannot anchor a deck to itself';
  END IF;

  IF p_side IS NULL OR p_side NOT IN ('before', 'after') THEN
    RAISE EXCEPTION 'Invalid side %, expected ''before'' or ''after''', p_side;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.decks
    WHERE public.decks.id = p_deck_id AND public.decks.member_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Deck not found or not owned by user';
  END IF;

  SELECT public.decks.rank
    INTO v_anchor_rank
    FROM public.decks
   WHERE public.decks.id        = p_anchor_id
     AND public.decks.member_id = v_uid;

  IF v_anchor_rank IS NULL THEN
    RAISE EXCEPTION 'Anchor deck % not found', p_anchor_id;
  END IF;

  -- Resolve missing neighbor, excluding the moved deck itself (see move_card
  -- for why: otherwise a no-op move bisects against the deck's own old rank).
  IF p_side = 'after' THEN
    v_left_id := p_anchor_id;
    SELECT public.decks.id
      INTO v_right_id
      FROM public.decks
     WHERE public.decks.member_id = v_uid
       AND public.decks.rank      > v_anchor_rank
       AND public.decks.id        <> p_deck_id
     ORDER BY public.decks.rank ASC
     LIMIT 1;
  ELSE  -- 'before'
    v_right_id := p_anchor_id;
    SELECT public.decks.id
      INTO v_left_id
      FROM public.decks
     WHERE public.decks.member_id = v_uid
       AND public.decks.rank      < v_anchor_rank
       AND public.decks.id        <> p_deck_id
     ORDER BY public.decks.rank DESC
     LIMIT 1;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_uid::text));

  BEGIN
    v_rank := public.deck_rank_between(v_uid, v_left_id, v_right_id);
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      PERFORM public.reindex_member_deck_ranks(v_uid);
      v_rank := public.deck_rank_between(v_uid, v_left_id, v_right_id);
  END;

  UPDATE public.decks SET rank = v_rank WHERE id = p_deck_id;

  RETURN v_rank;
END;
$$;


ALTER FUNCTION public.move_deck(p_deck_id bigint, p_anchor_id bigint, p_side text) OWNER TO postgres;


GRANT ALL ON FUNCTION public.move_deck(p_deck_id bigint, p_anchor_id bigint, p_side text) TO anon;
GRANT ALL ON FUNCTION public.move_deck(p_deck_id bigint, p_anchor_id bigint, p_side text) TO authenticated;
GRANT ALL ON FUNCTION public.move_deck(p_deck_id bigint, p_anchor_id bigint, p_side text) TO service_role;

