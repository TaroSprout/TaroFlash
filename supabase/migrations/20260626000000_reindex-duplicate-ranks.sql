-- =============================================================================
-- Reindex decks with duplicate card ranks
-- =============================================================================
--
-- A legacy import path created cards at the column's old default rank (1000),
-- so some decks hold many cards sharing one rank. The 20260419 backfill only
-- healed NULL ranks, not duplicates. Duplicate ranks break ordering two ways:
--
--   1. The cards page query orders by `rank` alone, so tied cards come back in
--      arbitrary heap order — unstable across refetches, and offset pagination
--      can skip or repeat cards across page boundaries.
--   2. move_card resolves the missing neighbour by `rank`, so among a block of
--      tied cards it bisects against an arbitrary one and the moved card lands
--      somewhere unexpected in the tie block.
--
-- reindex_deck_ranks rewrites every card in a deck to `row_number() * 1000`
-- ordered by (rank, id) — unique, evenly spaced, deterministic. We run it only
-- on decks that actually have a collision: a deck is dirty when its card count
-- differs from its distinct-rank count.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_deck_id bigint;
BEGIN
  FOR v_deck_id IN
    SELECT deck_id
      FROM public.cards
     WHERE deck_id IS NOT NULL
     GROUP BY deck_id
    HAVING count(*) <> count(DISTINCT rank)
  LOOP
    PERFORM public.reindex_deck_ranks(v_deck_id);
  END LOOP;
END $$;

COMMIT;
