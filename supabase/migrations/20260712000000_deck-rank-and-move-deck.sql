-- =============================================================================
-- decks.rank + move_deck: same fractional-rank reorder scheme as cards, scoped
-- by member_id instead of deck_id (a deck's "parent grouping" is its owner).
-- =============================================================================

BEGIN;

ALTER TABLE public.decks ADD COLUMN rank numeric;

WITH ordered AS (
  SELECT id, row_number() OVER (PARTITION BY member_id ORDER BY created_at, id) AS rn
  FROM public.decks
)
UPDATE public.decks d
SET rank = o.rn * 1000
FROM ordered o
WHERE d.id = o.id;

ALTER TABLE public.decks ALTER COLUMN rank SET NOT NULL;

CREATE OR REPLACE FUNCTION public.deck_rank_between(
  p_member_id uuid,
  p_left_deck_id bigint,
  p_right_deck_id bigint
)
RETURNS numeric
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

CREATE OR REPLACE FUNCTION public.reindex_member_deck_ranks(p_member_id uuid)
RETURNS void
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

CREATE OR REPLACE FUNCTION public.move_deck(
  p_deck_id   bigint,
  p_anchor_id bigint,
  p_side      text   -- 'before' | 'after'
)
RETURNS numeric
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

COMMIT;
