-- =============================================================================
-- Fix enforce_deck_card_limit errcode: PT001 → PT402 (valid HTTP 402)
-- =============================================================================
--
-- The cap helper raised SQLSTATE 'PT001'. The intent was only "a code distinct
-- from P0001 so the rank-precision retry block (EXCEPTION WHEN SQLSTATE 'P0001')
-- doesn't swallow it" — but the `PT` SQLSTATE class is RESERVED by PostgREST:
-- a `PTxyz` errcode tells PostgREST to respond with HTTP status `xyz`. So
-- 'PT001' asked for HTTP status 001 — not a valid status — which surfaced on
-- the client as a long-hanging request that returned an empty/garbled response
-- instead of a clean 4xx with the JSON error body.
--
-- 'PT402' keeps the same "distinct from P0001" property AND maps to a real,
-- fitting status: 402 Payment Required ("upgrade your plan"). The JSON body
-- still carries `code: "PT402"`, which the FE matches in `useCardLimitGate`.
--
-- Only the helper raises, so replacing it fixes both insert_card_at and
-- bulk_insert_cards_in_deck (they PERFORM this helper).
-- =============================================================================

BEGIN;

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
      USING ERRCODE = 'PT402',
            DETAIL  = format('Plan allows max %s cards per deck', v_limit),
            HINT    = 'Upgrade the plan to raise the per-deck card cap';
  END IF;
END;
$$;

COMMIT;
