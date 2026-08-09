import { useMutation, useQueryCache } from '@pinia/colada'
import { resumeSubscription } from '../db'

/**
 * Calls off a cancellation, so the plan carries on as if it never happened.
 * Only possible while the plan is still running out its final period.
 */
export function useResumeSubscriptionMutation() {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: () => resumeSubscription(),
    onSettled: () => {
      queryCache.invalidateQueries({ key: ['billing'] })
      queryCache.invalidateQueries({ key: ['member'] })
    }
  })
}
