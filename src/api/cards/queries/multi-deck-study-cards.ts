import { useQuery } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'
import { fetchMultiDeckStudyCards } from '../db'

/**
 * Server-built study queue merged across several decks, in the given deck order.
 * Backed by the per-deck RPC (caps + new/review partition stay per deck); the FE
 * just consumes the concatenated result.
 */
export function useMultiDeckStudyCardsQuery(deck_ids: MaybeRefOrGetter<number[]>) {
  return useQuery({
    key: () => ['cards', 'study-session-multi', toValue(deck_ids)],
    query: () => fetchMultiDeckStudyCards(toValue(deck_ids))
  })
}
