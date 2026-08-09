import { useMutation, useQueryCache } from '@pinia/colada'
import { changePlan } from '../db'

/**
 * Moves the member onto a different plan. The difference is charged or credited
 * straight away, not held over to the end of the period.
 */
export function useChangePlanMutation() {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (planId: string) => changePlan(planId),
    onSettled: () => {
      queryCache.invalidateQueries({ key: ['billing'] })
      queryCache.invalidateQueries({ key: ['member'] })
    }
  })
}
