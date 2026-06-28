import { useQuery } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'
import { fetchAllCardsInDeck } from '../db'

/**
 * The whole deck's cards (with reviews) for full-deck sort modes. Gated by
 * `enabled` so the unbounded fetch only fires when a non-default sort is on.
 */
export function useAllCardsInDeckQuery(
  deck_id: MaybeRefOrGetter<number>,
  enabled: MaybeRefOrGetter<boolean>
) {
  return useQuery({
    key: () => ['cards', toValue(deck_id), 'all'],
    query: () => fetchAllCardsInDeck(toValue(deck_id)),
    enabled: () => toValue(enabled)
  })
}
