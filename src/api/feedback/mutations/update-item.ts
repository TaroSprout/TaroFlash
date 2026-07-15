import { useMutation, useQueryCache } from '@pinia/colada'
import { updateFeedbackItem, type UpdateFeedbackItemParams } from '../db'

export function useUpdateFeedbackItemMutation() {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (params: UpdateFeedbackItemParams) => updateFeedbackItem(params),
    onSettled: () => queryCache.invalidateQueries({ key: ['feedback-items'] })
  })
}
