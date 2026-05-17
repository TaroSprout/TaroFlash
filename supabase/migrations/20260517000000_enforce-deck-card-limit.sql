-- =============================================================================
-- enforce_deck_card_limit: data-driven cap check sourced from plans table
-- =============================================================================
--
-- The card-per-deck cap was previously a magic number (200) baked into the
-- helper. This migration moves the cap onto the `plans` lookup table so:
--   * adding a tier ("pro") with its own cap is a data change, not a migration
--   * the FE can read the cap directly to gate UI before round-tripping
--   * paid/unlimited tiers are expressed as NULL (no cap), not a sentinel
--
-- The helper now joins members → plans on every call. Single-row lookup on a
-- tiny indexed table — cheap. Also retrofits `insert_card_at` and
-- `bulk_insert_cards_in_deck` to call it; `move_cards_to_deck` (next
-- migration) uses the same helper.
--
-- Errcode 'PT001' is used so the existing `EXCEPTION WHEN SQLSTATE 'P0001'`
-- retry block in `insert_card_at` (for rank-precision exhaustion) doesn't
-- swallow the cap error. The cap check is placed BEFORE the advisory lock
-- + bisection so the limit fails fast without touching rank state.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Add the cap column to plans. NULL = unlimited.
-- ---------------------------------------------------------------------------
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS cards_per_deck_limit int;

UPDATE public.plans SET cards_per_deck_limit = 200  WHERE id = 'free';
UPDATE public.plans SET cards_per_deck_limit = NULL WHERE id = 'paid';

-- ---------------------------------------------------------------------------
-- 2. Helper: enforce the caller's plan-defined cap on a given deck.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_deck_card_limit(
  p_deck_id bigint,
  p_adding  int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int;
  v_count int;
BEGIN
  SELECT p.cards_per_deck_limit
    INTO v_limit
    FROM public.members m
    JOIN public.plans   p ON p.id = m.plan
   WHERE m.id = auth.uid();

  -- Unlimited tier or unknown caller → no-op. (Auth is enforced by the
  -- calling RPC; this helper stays narrow.)
  IF v_limit IS NULL THEN
    RETURN;
  END IF;

  SELECT count(*) INTO v_count
    FROM public.cards
   WHERE public.cards.deck_id = p_deck_id;

  IF v_count + p_adding > v_limit THEN
    RAISE EXCEPTION 'deck_card_limit_exceeded'
      USING ERRCODE = 'PT001',
            DETAIL  = format('Plan allows max %s cards per deck', v_limit);
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Retrofit insert_card_at: single-card add → enforce cap (+1).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.insert_card_at(
  p_deck_id    bigint,
  p_anchor_id  bigint,
  p_side       text,
  p_front_text text,
  p_back_text  text
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

  INSERT INTO public.cards (member_id, deck_id, rank, front_text, back_text)
  VALUES (
    v_uid,
    p_deck_id,
    v_rank,
    COALESCE(p_front_text, ''),
    COALESCE(p_back_text, '')
  )
  RETURNING public.cards.id, public.cards.rank
  INTO id, rank;

  RETURN NEXT;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Retrofit bulk_insert_cards_in_deck: enforce cap by array length.
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

    INSERT INTO public.cards (member_id, deck_id, rank, front_text, back_text)
    VALUES (
      v_uid,
      p_deck_id,
      v_rank,
      COALESCE(v_card->>'front_text', ''),
      COALESCE(v_card->>'back_text', '')
    )
    RETURNING * INTO v_inserted;

    RETURN NEXT v_inserted;
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Drop the prior-name helper if it landed during branch-local iteration.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.enforce_free_deck_card_limit(bigint, int);

COMMIT;
