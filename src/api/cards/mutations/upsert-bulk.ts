import { useMutation, useQueryCache } from '@pinia/colada'
import type { CardBase } from '@type/card'
import { upsertCards } from '../db'
import { invalidateAllCardCounts, invalidateCardIndex, invalidateDeck } from './_invalidate'

export function useUpsertCardsMutation() {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (cards: Partial<CardBase>[]) => upsertCards(cards),
    onSettled: (_data, _error, cards) => {
      const deck_ids = new Set(cards.map((c) => c.deck_id).filter((id) => id !== undefined))
      deck_ids.forEach((id) => invalidateDeck(queryCache, id))
      invalidateAllCardCounts(queryCache)
      invalidateCardIndex(queryCache)
    }
  })
}
