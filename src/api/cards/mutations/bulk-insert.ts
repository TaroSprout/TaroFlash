import { useMutation, useQueryCache } from '@pinia/colada'
import { bulkInsertCardsInDeck, type BulkInsertCardsParams } from '../db'
import { invalidateAllCardCounts, invalidateCardIndex, invalidateDeck } from './_invalidate'

export function useBulkInsertCardsInDeckMutation() {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (params: BulkInsertCardsParams) => bulkInsertCardsInDeck(params),
    onSettled: (_data, _error, params) => {
      invalidateDeck(queryCache, params.deck_id)
      invalidateAllCardCounts(queryCache)
      invalidateCardIndex(queryCache)
    }
  })
}
