import { useQuery } from '@pinia/colada'
import { fetchPlanLimits } from '../db'

export function usePlanLimitsQuery() {
  return useQuery({
    key: ['plans'],
    query: fetchPlanLimits
  })
}
