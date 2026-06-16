-- =============================================================================
-- cards.note: optional free-text note that rides along with a card
-- =============================================================================
--
-- The audio-reader term popover hands the learner a contextual explanation
-- (which larger word the selection sits in, its sense here, other uses). When
-- they save the card we want that explanation to ride along as a `note`.
--
-- Two card writers exist (insert_card_at for single adds, bulk_insert_cards_in_deck
-- for paste/import) — both gain note support so the column is never silently lost.
--
-- SIGNATURE CHANGE: insert_card_at grows a 6th parameter. CREATE OR REPLACE only
-- replaces a function whose argument list is IDENTICAL — a 6-arg version would be
-- created *alongside* the existing 5-arg one. A 5-arg call (the pgTAP tests, or a
-- PostgREST call that omits the defaulted arg) would then match BOTH and fail with
-- "function is not unique". So we DROP the old signature first, then CREATE the new
-- one. `p_note text DEFAULT NULL` keeps every existing 5-arg caller working.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. The column. Nullable, no default — most cards carry no note.
-- ---------------------------------------------------------------------------
ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS note text;

-- ---------------------------------------------------------------------------
-- 2. insert_card_at: add p_note, store it on the new row.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.insert_card_at(bigint, bigint, text, text, text);

CREATE FUNCTION public.insert_card_at(
  p_deck_id    bigint,
  p_anchor_id  bigint,
  p_side       text,
  p_front_text text,
  p_back_text  text,
  p_note       text DEFAULT NULL
)
RETURNS TABLE(id bigint, rank numeric)
LANGUAGE plpgsql
AS $$
DECLARE
  v_uid         uuid    := auth.uid();
  v_anchor_rank numeric;
  v_left_id     bigint;
  v_right_id    bigint;
  v_rank        numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.decks
    WHERE public.decks.id = p_deck_id AND public.decks.member_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Deck not found or not owned by user';
  END IF;

  IF p_anchor_id IS NOT NULL AND (p_side IS NULL OR p_side NOT IN ('before', 'after')) THEN
    RAISE EXCEPTION 'Invalid side %, expected ''before'' or ''after''', p_side;
  END IF;

  -- Plan-defined cap (fails fast before locking).
  PERFORM public.enforce_deck_card_limit(p_deck_id, 1);

  IF p_anchor_id IS NOT NULL THEN
    SELECT public.cards.rank
      INTO v_anchor_rank
      FROM public.cards
     WHERE public.cards.id      = p_anchor_id
       AND public.cards.deck_id = p_deck_id;

    IF v_anchor_rank IS NULL THEN
      RAISE EXCEPTION 'Anchor card % not found in deck %', p_anchor_id, p_deck_id;
    END IF;

    IF p_side = 'after' THEN
      v_left_id := p_anchor_id;
      SELECT public.cards.id
        INTO v_right_id
        FROM public.cards
       WHERE public.cards.deck_id = p_deck_id
         AND public.cards.rank    > v_anchor_rank
       ORDER BY public.cards.rank ASC
       LIMIT 1;
    ELSE
      v_right_id := p_anchor_id;
      SELECT public.cards.id
        INTO v_left_id
        FROM public.cards
       WHERE public.cards.deck_id = p_deck_id
         AND public.cards.rank    < v_anchor_rank
       ORDER BY public.cards.rank DESC
       LIMIT 1;
    END IF;
  END IF;

  PERFORM pg_advisory_xact_lock(p_deck_id);

  BEGIN
    v_rank := public.card_rank_between(p_deck_id, v_left_id, v_right_id);
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      PERFORM public.reindex_deck_ranks(p_deck_id);
      v_rank := public.card_rank_between(p_deck_id, v_left_id, v_right_id);
  END;

  INSERT INTO public.cards (member_id, deck_id, rank, front_text, back_text, note)
  VALUES (
    v_uid,
    p_deck_id,
    v_rank,
    COALESCE(p_front_text, ''),
    COALESCE(p_back_text, ''),
    p_note
  )
  RETURNING public.cards.id, public.cards.rank
  INTO id, rank;

  RETURN NEXT;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. bulk_insert_cards_in_deck: carry an optional per-card `note` from the
--    payload. Signature is unchanged, so CREATE OR REPLACE is fine here.
--    `v_card->>'note'` is NULL when the key is absent, so existing callers that
--    don't send a note are unaffected.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bulk_insert_cards_in_deck(
  p_deck_id bigint,
  p_cards   jsonb
)
RETURNS SETOF public.cards
LANGUAGE plpgsql
AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_max_rank numeric;
  v_step     numeric := 1000;
  v_rank     numeric;
  v_card     jsonb;
  v_inserted public.cards;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.decks
    WHERE public.decks.id = p_deck_id AND public.decks.member_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Deck not found or not owned by user';
  END IF;

  -- Plan-defined cap (fails fast before locking).
  PERFORM public.enforce_deck_card_limit(
    p_deck_id,
    COALESCE(jsonb_array_length(p_cards), 0)
  );

  PERFORM pg_advisory_xact_lock(p_deck_id);

  SELECT COALESCE(MAX(public.cards.rank), 0)
    INTO v_max_rank
    FROM public.cards
   WHERE public.cards.deck_id = p_deck_id;

  v_rank := v_max_rank;

  FOR v_card IN SELECT * FROM jsonb_array_elements(p_cards)
  LOOP
    v_rank := v_rank + v_step;

    INSERT INTO public.cards (member_id, deck_id, rank, front_text, back_text, note)
    VALUES (
      v_uid,
      p_deck_id,
      v_rank,
      COALESCE(v_card->>'front_text', ''),
      COALESCE(v_card->>'back_text', ''),
      v_card->>'note'
    )
    RETURNING * INTO v_inserted;

    RETURN NEXT v_inserted;
  END LOOP;
END;
$$;

COMMIT;
