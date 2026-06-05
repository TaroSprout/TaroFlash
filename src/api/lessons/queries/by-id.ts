import { useQuery } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'
import { fetchLesson } from '../db'

export function useLessonQuery(id: MaybeRefOrGetter<number>) {
  return useQuery({
    key: () => ['lesson', toValue(id)],
    query: () => fetchLesson(toValue(id))
  })
}
