-- =============================================================================
-- Make `plans` the single source of truth for plan-gated numeric limits, and
-- add the deck-count enforcement that was previously FE-only.
--
-- Before this migration, `deckLimit`/`cardsPerDeckLimit` lived in the FE's
-- src/config/plans.ts *and* cards_per_deck_limit lived here in `plans` —
-- two places to keep in sync by hand. The FE now queries this table instead
-- of hardcoding the numbers (see src/api/plans/).
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Bump the free-tier caps + add a deck-count cap (NULL = unlimited, same
--    convention as cards_per_deck_limit).
-- ---------------------------------------------------------------------------
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS deck_limit int;

UPDATE public.plans SET deck_limit = 10   WHERE id = 'free';
UPDATE public.plans SET deck_limit = NULL WHERE id = 'paid';

UPDATE public.plans SET cards_per_deck_limit = 500 WHERE id = 'free';

-- ---------------------------------------------------------------------------
-- 2. display_name was never actually read anywhere — the FE renders its own
--    plan copy (name/price/features) from src/config/plans.ts + i18n, and no
--    edge function selects this column. Drop the dead column.
-- ---------------------------------------------------------------------------
ALTER TABLE public.plans DROP COLUMN display_name;

-- ---------------------------------------------------------------------------
-- 3. Deck-count cap enforcement. This didn't exist server-side at all before
--    — useCan().createDeck was (and remains) a client-side UX gate with no
--    backstop. Mirror enforce_deck_card_limit's shape: look up the caller's
--    plan cap, raise PT402 (-> HTTP 402, same convention the card-limit
--    check uses) when it would be exceeded.
--
--    upsertDeck() always supplies an existing id for edits (ON CONFLICT DO
--    UPDATE); only a genuine create — id not yet assigned by the identity
--    column — can add a net-new deck, so we skip the check whenever NEW.id
--    is already set.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_member_deck_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int;
  v_count int;
BEGIN
  IF NEW.id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.deck_limit
    INTO v_limit
    FROM public.members m
    JOIN public.plans   p ON p.id = m.plan
   WHERE m.id = auth.uid();

  IF v_limit IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_count
    FROM public.decks
   WHERE public.decks.member_id = auth.uid();

  IF v_count + 1 > v_limit THEN
    RAISE EXCEPTION 'deck_limit_exceeded'
      USING ERRCODE = 'PT402',
            DETAIL  = format('Plan allows max %s decks', v_limit);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_deck_limit_on_insert
  BEFORE INSERT ON public.decks
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_member_deck_limit();

COMMIT;
