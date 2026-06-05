import { useQuery } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'
import { fetchLessonsByCollection } from '../db'

export function useLessonsByCollectionQuery(collection_id: MaybeRefOrGetter<number>) {
  return useQuery({
    key: () => ['lessons', toValue(collection_id)],
    query: () => fetchLessonsByCollection(toValue(collection_id))
  })
}
