import { useMutation, useQueryCache } from '@pinia/colada'
import { deleteLesson } from '../db'

export type DeleteLessonVars = {
  id: number
  // The owning collection, so we invalidate the right lesson list + its count.
  collection_id: number
}

export function useDeleteLessonMutation() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: ({ id }: DeleteLessonVars) => deleteLesson(id),
    onSettled: (_data, error, { id, collection_id }) => {
      queryCache.invalidateQueries({ key: ['lessons', collection_id] })
      // The collection's lesson_count (counts view) dropped by one.
      queryCache.invalidateQueries({ key: ['lesson-collections'] })
      // On success the row is gone — drop the cached entry without a refetch
      // (which would 404). On error the row still exists; leave its cache alone.
      if (!error) queryCache.invalidateQueries({ key: ['lesson', id] }, false)
    }
  })
}
