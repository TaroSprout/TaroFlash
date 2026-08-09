import { useQuery } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'
import { fetchCardsByIds } from '../db'

/**
 * Named cards, whether or not they're due — how a study session picks its pile
 * back up after a reload.
 */
export function useCardsByIdsQuery(card_ids: MaybeRefOrGetter<number[]>) {
  return useQuery({
    key: () => ['cards', 'by-ids', toValue(card_ids)],
    query: () => fetchCardsByIds(toValue(card_ids)),
    enabled: () => toValue(card_ids).length > 0
  })
}
