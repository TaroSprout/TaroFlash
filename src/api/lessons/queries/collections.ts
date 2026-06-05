import { useQuery } from '@pinia/colada'
import { fetchMemberLessonCollections } from '../db'

export function useLessonCollectionsQuery() {
  return useQuery({
    key: ['lesson-collections'],
    query: fetchMemberLessonCollections
  })
}
