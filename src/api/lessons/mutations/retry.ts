import { useMutation, useQueryCache } from '@pinia/colada'
import { retryLessonTranscription } from '../db/ai'

export type RetryLessonVars = {
  id: number
  // The collection the lesson lives in — carried so onSettled can invalidate its
  // list without the caller owning invalidation.
  collection_id: number
}

/**
 * Re-run transcription for a lesson that failed. The audio is still in storage,
 * so this resets the row to `processing` and restarts the background worker; the
 * collection view's poll picks up the result.
 */
export function useRetryLessonMutation() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: ({ id }: RetryLessonVars) => retryLessonTranscription(id),
    onSettled: (_data, _error, { collection_id }) => {
      queryCache.invalidateQueries({ key: ['lessons', collection_id] })
    }
  })
}
