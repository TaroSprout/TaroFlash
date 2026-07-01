import { useQuery } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'
import { fetchDecksByIds } from '../db'

export function useDecksByIdsQuery(ids: MaybeRefOrGetter<number[]>) {
  return useQuery({
    key: () => ['decks', 'by-ids', toValue(ids)],
    query: () => fetchDecksByIds(toValue(ids)),
    enabled: () => toValue(ids).length > 0
  })
}
