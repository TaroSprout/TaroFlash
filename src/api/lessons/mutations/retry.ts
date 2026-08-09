import { useMutation, useQueryCache } from '@pinia/colada'
import { retryLessonTranscription } from '../db/ai'

export type RetryLessonVars = {
  id: number
  // Carried so the caller never has to reload the collection itself.
  collection_id: number
}

/** Transcribes a failed chapter again. The audio is still stored, so nothing is re-uploaded. */
export function useRetryLessonMutation() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: ({ id }: RetryLessonVars) => retryLessonTranscription(id),
    onSettled: (_data, _error, { collection_id }) => {
      queryCache.invalidateQueries({ key: ['lessons', collection_id] })
    }
  })
}
