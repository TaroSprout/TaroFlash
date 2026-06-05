import { useQuery } from '@pinia/colada'
import { fetchMemberLessons } from '../db'

export function useLessonsQuery() {
  return useQuery({
    key: ['lessons'],
    query: fetchMemberLessons
  })
}
