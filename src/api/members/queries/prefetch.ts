import { useQueryCache } from '@pinia/colada'
import { fetchMemberById } from '../db'

export function prefetchMemberById(id: string) {
  const cache = useQueryCache()
  const entry = cache.ensure({
    key: ['member', id],
    query: () => fetchMemberById(id)
  })
  // `refresh`, never `fetch`: the member store already has this request in flight at app start.
  return cache.refresh(entry)
}
