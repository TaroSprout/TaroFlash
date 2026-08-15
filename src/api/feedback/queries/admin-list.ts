import { useQuery } from '@pinia/colada'
import { fetchAllFeedbackItems } from '../db'

export function useAdminFeedbackItemsQuery() {
  return useQuery({
    key: ['feedback-items', 'admin'],
    query: fetchAllFeedbackItems
  })
}
