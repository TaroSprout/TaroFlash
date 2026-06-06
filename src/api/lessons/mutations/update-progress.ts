import { useMutation, useQueryCache } from '@pinia/colada'
import { setCollectionProgress } from '../db'

export type SetCollectionProgressVars = {
  collection_id: number
  // The chapter the member just opened — becomes the collection's bookmark.
  lesson_id: number
}

/**
 * Bookmark the chapter the member is currently reading, so the dashboard reopens
 * the collection there next time. Fire-and-forget from the reader page on open;
 * onSettled refreshes the collection caches the dashboard resolves against.
 */
export function useSetCollectionProgressMutation() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: ({ collection_id, lesson_id }: SetCollectionProgressVars) =>
      setCollectionProgress(collection_id, lesson_id),
    onSettled: (_data, _error, { collection_id }) => {
      queryCache.invalidateQueries({ key: ['lesson-collections'] })
      queryCache.invalidateQueries({ key: ['lesson-collection', collection_id] })
    }
  })
}
