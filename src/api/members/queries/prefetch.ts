import { useQueryCache } from '@pinia/colada'
import { fetchMemberById } from '../db'

export function prefetchMemberById(id: string) {
  const cache = useQueryCache()
  const entry = cache.ensure({
    key: ['member', id],
    query: () => fetchMemberById(id)
  })
  // `refresh`, never `fetch` — `fetch` restarts a request already in flight, and
  // the member store starts this exact one at app start.
  return cache.refresh(entry)
}
