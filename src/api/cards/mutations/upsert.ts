import { useMutation, useQueryCache } from '@pinia/colada'
import type { CardBase } from '@type/card'
import { upsertCard } from '../db'
import { invalidateCardIndex, invalidateDeck } from './_invalidate'

export function useUpsertCardMutation() {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (card: Partial<CardBase>) => upsertCard(card),
    onSettled: (_data, _error, card) => {
      invalidateDeck(queryCache, card.deck_id)
      invalidateCardIndex(queryCache)
    }
  })
}
