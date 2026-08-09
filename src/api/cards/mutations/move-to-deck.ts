import { useMutation, useQueryCache } from '@pinia/colada'
import { moveCardsToDeck, type MoveCardsToDeckArgs } from '../db'
import { invalidateAllCardCounts, invalidateCardIndex, invalidateDeck } from './_invalidate'

// `source_deck_ids` rides along so the caller never has to touch the cache itself.
export type MoveCardsToDeckVars =
  | { target_deck_id: number; card_ids: number[]; source_deck_ids: number[] }
  | { target_deck_id: number; source_deck_id: number; except_ids: number[]; count: number }

function toDbArgs(vars: MoveCardsToDeckVars): MoveCardsToDeckArgs {
  if ('card_ids' in vars) {
    return { target_deck_id: vars.target_deck_id, card_ids: vars.card_ids }
  }
  return {
    target_deck_id: vars.target_deck_id,
    source_deck_id: vars.source_deck_id,
    except_ids: vars.except_ids,
    count: vars.count
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
      // A move can leave you looking at neither deck, so reload both off-screen too.
      sourceDeckIds(vars).forEach((id) =>
        invalidateDeck(queryCache, id, { refetch_inactive: true })
      )
      invalidateDeck(queryCache, vars.target_deck_id, { refetch_inactive: true })
      invalidateAllCardCounts(queryCache)
      invalidateCardIndex(queryCache)
    }
  })
}
