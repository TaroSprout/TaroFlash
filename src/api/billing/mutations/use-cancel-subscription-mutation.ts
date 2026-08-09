import { useMutation, useQueryCache } from '@pinia/colada'
import { cancelSubscription } from '../db'

/**
 * Cancels the member's plan. `atPeriodEnd: true` lets it run to the end of what
 * they've paid for and can still be called off; `false` ends it on the spot.
 */
export function useCancelSubscriptionMutation() {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (atPeriodEnd: boolean) => cancelSubscription(atPeriodEnd),
    onSettled: () => {
      queryCache.invalidateQueries({ key: ['billing'] })
      queryCache.invalidateQueries({ key: ['member'] })
    }
  })
}
