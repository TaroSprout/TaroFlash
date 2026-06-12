import { useMutation, useQueryCache } from '@pinia/colada'
import { setCollectionProgress } from '../db'

export type SetCollectionProgressVars = {
  collection_id: number
  // The chapter the member is on — becomes the collection's bookmark.
  lesson_id: number
  // Audio offset (seconds) within that chapter; defaults to the chapter start.
  position_seconds?: number
}

/**
 * Persist the member's resume point — which chapter they're on plus the audio
 * offset within it. Fires on reader open (offset 0) and then throttled during
 * playback, so onSettled patches the collection caches in place rather than
 * invalidating: a refetch on every playback tick would be wasteful and could
 * re-trigger the reader's restore.
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
