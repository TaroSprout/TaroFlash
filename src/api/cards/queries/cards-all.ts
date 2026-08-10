import { useQuery } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'
import { fetchAllCardsInDeck } from '../db'

/**
 * Every card in a deck, fetched on demand rather than kept live — exporting
 * needs the full list once, not a query that stays in sync with the deck.
 */
export function useAllCardsInDeckQuery(deck_id: MaybeRefOrGetter<number | undefined>) {
  return useQuery({
    key: () => ['cards', toValue(deck_id) ?? 0, 'all'],
    query: () => fetchAllCardsInDeck(toValue(deck_id) as number),
    enabled: () => false
  })
}
