import { useMutation, useQueryCache } from '@pinia/colada'
import { createLessonCollection } from '../db'

export function useCreateLessonCollectionMutation() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: (title: string): Promise<LessonCollection> => createLessonCollection(title),
    onSettled: () => {
      queryCache.invalidateQueries({ key: ['lesson-collections'] })
    }
  })
}
