import { useMutation, useQueryCache } from '@pinia/colada'
import { deleteLesson } from '../db'

export function useDeleteLessonMutation() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: (id: number) => deleteLesson(id),
    onSettled: (_data, error, id) => {
      queryCache.invalidateQueries({ key: ['lessons'] })
      // On success the row is gone — drop the cached entry without a refetch
      // (which would 404). On error the row still exists; leave its cache alone.
      if (!error) queryCache.invalidateQueries({ key: ['lesson', id] }, false)
    }
  })
}
