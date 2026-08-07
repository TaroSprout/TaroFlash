import { useMutation, useQueryCache } from '@pinia/colada'
import { insertCard, type InsertCardParams } from '../db'
import { invalidateAllCardCounts, invalidateCardIndex, invalidateDeck } from './_invalidate'

export type { InsertCardParams }

export function useInsertCardMutation() {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (params: InsertCardParams) => insertCard(params),
    onSettled: (_data, _error, params) => {
      invalidateDeck(queryCache, params.deck_id)
      invalidateAllCardCounts(queryCache)

      // The index maps front text → decks, so a card inserted without one adds
      // nothing to it. Skips the refetch for every eagerly-created blank card.
      if (params.front_text) invalidateCardIndex(queryCache)
    }
  })
}
