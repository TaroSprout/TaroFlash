import { useMutation, useQueryCache } from '@pinia/colada'
import { toggleFeedbackVote } from '../db'

export function useToggleFeedbackVoteMutation() {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (feedback_id: number) => toggleFeedbackVote(feedback_id),
    onSettled: () => queryCache.invalidateQueries({ key: ['feedback-items'] })
  })
}
