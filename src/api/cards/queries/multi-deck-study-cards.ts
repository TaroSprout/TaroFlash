import { useQuery } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'
import { fetchMultiDeckStudyCards } from '../db'

/**
 * Server-built study queue merged across several decks, in the given deck order.
 * Backed by the per-deck RPC (caps + new/review partition stay per deck); the FE
 * just consumes the concatenated result.
 */
export function useMultiDeckStudyCardsQuery(
  deck_ids: MaybeRefOrGetter<number[]>,
  study_all: MaybeRefOrGetter<boolean> = false
) {
  return useQuery({
    key: () => ['cards', 'study-session-multi', toValue(deck_ids), toValue(study_all)],
    query: () => fetchMultiDeckStudyCards(toValue(deck_ids), toValue(study_all))
  })
}
