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
      invalidateCardIndex(queryCache)
    }
  })
}
