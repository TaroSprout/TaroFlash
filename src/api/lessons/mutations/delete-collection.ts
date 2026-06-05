import { useMutation, useQueryCache } from '@pinia/colada'
import { deleteLessonCollection } from '../db'

export function useDeleteLessonCollectionMutation() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: (id: number) => deleteLessonCollection(id),
    onSettled: (_data, error, id) => {
      queryCache.invalidateQueries({ key: ['lesson-collections'] })
      // On success the collection (and its lessons, via cascade) are gone — drop
      // the cached detail + lesson-list entries without a refetch that would 404.
      if (!error) {
        queryCache.invalidateQueries({ key: ['lesson-collection', id] }, false)
        queryCache.invalidateQueries({ key: ['lessons', id] }, false)
      }
    }
  })
}
