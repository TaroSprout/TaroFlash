import { useMutation, useQueryCache } from '@pinia/colada'
import { setCollectionProgress } from '../db'

export type SetCollectionProgressVars = {
  collection_id: number
  lesson_id: number
  // Seconds into that chapter. Defaults to its start.
  position_seconds?: number
}

/**
 * Saves where the member got to, so they can pick the book back up.
 *
 * Runs over and over while they listen, so it writes the new position straight
 * into what's loaded — re-reading it each time could jerk them back.
 */
export function useSetCollectionProgressMutation() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: ({ collection_id, lesson_id, position_seconds = 0 }: SetCollectionProgressVars) =>
      setCollectionProgress(collection_id, lesson_id, position_seconds),
    onSettled: (_data, _error, { collection_id, lesson_id, position_seconds = 0 }) => {
      const bookmark = { last_lesson_id: lesson_id, last_position_seconds: position_seconds }

      const single = queryCache.getQueryData<LessonCollection>(['lesson-collection', collection_id])
      if (single)
        queryCache.setQueryData(['lesson-collection', collection_id], { ...single, ...bookmark })

      const list = queryCache.getQueryData<LessonCollectionWithCount[]>(['lesson-collections'])
      if (list) {
        queryCache.setQueryData(
          ['lesson-collections'],
          list.map((collection) =>
            collection.id === collection_id ? { ...collection, ...bookmark } : collection
          )
        )
      }
    }
  })
}
