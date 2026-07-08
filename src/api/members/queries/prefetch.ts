import { useQueryCache } from '@pinia/colada'
import { fetchMemberById } from '../db'

export function prefetchMemberById(id: string) {
  const cache = useQueryCache()
  const entry = cache.ensure({
    key: ['member', id],
    query: () => fetchMemberById(id)
  })
  // refresh(), not fetch() — fetch() unconditionally aborts and restarts any
  // in-flight request, which doubles this exact fetch when the member store's
  // own reactive query (mounted at the app root) already started it.
  return cache.refresh(entry)
}
