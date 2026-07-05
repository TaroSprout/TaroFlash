import { useQueryCache } from '@pinia/colada'
import { fetchPlanLimits } from '../db'

export function prefetchPlanLimits() {
  const cache = useQueryCache()
  const entry = cache.ensure({ key: ['plans'], query: fetchPlanLimits })
  return cache.fetch(entry)
}
