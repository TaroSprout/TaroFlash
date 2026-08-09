import { useMutation, useQueryCache } from '@pinia/colada'
import { deleteLesson } from '../db'

export type DeleteLessonVars = {
  id: number
  // Carried so the caller never has to reload the collection itself.
  collection_id: number
}

export function useDeleteLessonMutation() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: ({ id }: DeleteLessonVars) => deleteLesson(id),
    onSettled: (_data, error, { id, collection_id }) => {
      queryCache.invalidateQueries({ key: ['lessons', collection_id] })
      queryCache.invalidateQueries({ key: ['lesson-collections'] })
      // Forget it rather than reload it — there's nothing left there to ask for.
      if (!error) queryCache.invalidateQueries({ key: ['lesson', id] }, false)
    }
  })
}
