import { useQuery } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'
import { fetchCardsByIds } from '../db'

/**
 * Fetches cards by explicit id, bypassing the due-cards filter — used to
 * restore a study session's locked queue after a refresh.
 */
export function useCardsByIdsQuery(card_ids: MaybeRefOrGetter<number[]>) {
  return useQuery({
    key: () => ['cards', 'by-ids', toValue(card_ids)],
    query: () => fetchCardsByIds(toValue(card_ids)),
    enabled: () => toValue(card_ids).length > 0
  })
}
