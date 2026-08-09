import { useMutation, useQueryCache } from '@pinia/colada'
import { insertCard, type InsertCardParams } from '../db'
import { invalidateAllCardCounts, invalidateCardIndex, invalidateDeck } from './_invalidate'

export type { InsertCardParams }

export function useInsertCardMutation() {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (params: InsertCardParams) => insertCard(params),
    onSettled: (_data, _error, params) => {
      // A blank card is already on screen exactly as the server stores it, so only
      // the counts moved. An insert carrying text has no such row and still reloads.
      const blank = !params.front_text && !params.back_text

      invalidateDeck(queryCache, params.deck_id, { card_pages: !blank })
      invalidateAllCardCounts(queryCache)

      // The index is keyed by front text, so a card without one adds nothing to it.
      if (params.front_text) invalidateCardIndex(queryCache)
    }
  })
}
