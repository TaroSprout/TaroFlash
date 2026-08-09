import { useMutation, useQueryCache } from '@pinia/colada'
import { deleteLessonCollection } from '../db'

export function useDeleteLessonCollectionMutation() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: (id: number) => deleteLessonCollection(id),
    onSettled: (_data, error, id) => {
      queryCache.invalidateQueries({ key: ['lesson-collections'] })
      // Forget them rather than reload them — the collection and its chapters are gone.
      if (!error) {
        queryCache.invalidateQueries({ key: ['lesson-collection', id] }, false)
        queryCache.invalidateQueries({ key: ['lessons', id] }, false)
      }
    }
  })
}
