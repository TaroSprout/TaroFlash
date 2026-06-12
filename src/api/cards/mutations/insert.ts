import { useMutation, useQueryCache } from '@pinia/colada'
import { insertCardAt, type InsertCardAtParams } from '../db'
import { invalidateAllCardCounts, invalidateCardIndex, invalidateDeck } from './_invalidate'

export type { InsertCardAtParams }

export function useInsertCardAtMutation() {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (params: InsertCardAtParams) => insertCardAt(params),
    onSettled: (_data, _error, params) => {
      invalidateDeck(queryCache, params.deck_id)
      invalidateAllCardCounts(queryCache)
      invalidateCardIndex(queryCache)
    }
  })
}
