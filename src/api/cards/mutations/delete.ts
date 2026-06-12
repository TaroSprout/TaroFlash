import { useMutation, useQueryCache } from '@pinia/colada'
import type { CardBase } from '@type/card'
import { deleteCards, deleteCardsInDeck, type DeleteCardsInDeckParams } from '../db'
import { invalidateAllCardCounts, invalidateCardIndex, invalidateDeck } from './_invalidate'

export function useDeleteCardsMutation() {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (cards: CardBase[]) => deleteCards(cards),
    onSettled: (_data, _error, cards) => {
      const deck_ids = new Set(cards.map((c) => c.deck_id).filter((id) => id !== undefined))
      deck_ids.forEach((id) => invalidateDeck(queryCache, id))
      invalidateAllCardCounts(queryCache)
      invalidateCardIndex(queryCache)
    }
  })
}

export function useDeleteCardsInDeckMutation() {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (params: DeleteCardsInDeckParams) => deleteCardsInDeck(params),
    onSettled: (_data, _error, { deck_id }) => {
      invalidateDeck(queryCache, deck_id)
      invalidateAllCardCounts(queryCache)
      invalidateCardIndex(queryCache)
    }
  })
}
