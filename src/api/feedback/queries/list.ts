import { useQuery } from '@pinia/colada'
import { fetchFeedbackItems } from '../db'

export function useFeedbackItemsQuery() {
  return useQuery({
    key: ['feedback-items'],
    query: fetchFeedbackItems
  })
}
