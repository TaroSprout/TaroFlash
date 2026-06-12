import { useMutation, useQueryCache } from '@pinia/colada'
import { moveCardsToDeck, type MoveCardsToDeckArgs } from '../db'
import { invalidateAllCardCounts, invalidateCardIndex, invalidateDeck } from './_invalidate'

// Mutation vars mirror the RPC's two modes (explicit vs select-all) and add
// `source_deck_ids` to the explicit variant so the hook can invalidate
// source decks without the caller doing any cache work.
export type MoveCardsToDeckVars =
  | { target_deck_id: number; card_ids: number[]; source_deck_ids: number[] }
  | { target_deck_id: number; source_deck_id: number; except_ids: number[] }

function toDbArgs(vars: MoveCardsToDeckVars): MoveCardsToDeckArgs {
  if ('card_ids' in vars) {
    return { target_deck_id: vars.target_deck_id, card_ids: vars.card_ids }
  }
  return {
    target_deck_id: vars.target_deck_id,
    source_deck_id: vars.source_deck_id,
    except_ids: vars.except_ids
  }
}

function sourceDeckIds(vars: MoveCardsToDeckVars): number[] {
  return 'card_ids' in vars ? vars.source_deck_ids : [vars.source_deck_id]
}

export function useMoveCardsToDeckMutation() {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (vars: MoveCardsToDeckVars) => moveCardsToDeck(toDbArgs(vars)),
    onSettled: (_data, _error, vars) => {
      // refetch_inactive: user may be on neither source nor target deck after
      // a cross-deck move. Without it, the previously-viewed target deck
      // would render stale cached pages on re-entry.
      sourceDeckIds(vars).forEach((id) =>
        invalidateDeck(queryCache, id, { refetch_inactive: true })
      )
      invalidateDeck(queryCache, vars.target_deck_id, { refetch_inactive: true })
      invalidateAllCardCounts(queryCache)
      invalidateCardIndex(queryCache)
    }
  })
}
