import { useQuery } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'
import { fetchLessonCollection } from '../db'

export function useLessonCollectionQuery(id: MaybeRefOrGetter<number>) {
  return useQuery({
    key: () => ['lesson-collection', toValue(id)],
    query: () => fetchLessonCollection(toValue(id))
  })
}
