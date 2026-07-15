import { useMutation, useQueryCache } from '@pinia/colada'
import { submitFeedback, type SubmitFeedbackParams } from '../db'

export function useSubmitFeedbackMutation() {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (params: SubmitFeedbackParams) => submitFeedback(params),
    onSettled: () => queryCache.invalidateQueries({ key: ['feedback-items'] })
  })
}
