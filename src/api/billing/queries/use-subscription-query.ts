import { useQuery } from '@pinia/colada'
import { getSubscription } from '../db'

/**
 * The member's plan and what they'll be charged next. Both come back `null`
 * for someone on the free plan, who has never been billed.
 */
export function useSubscriptionQuery() {
  return useQuery({
    key: ['billing', 'subscription'],
    query: () => getSubscription()
  })
}
