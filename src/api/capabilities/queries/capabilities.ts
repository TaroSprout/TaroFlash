import { useQuery } from '@pinia/colada'
import { useSessionStore } from '@/stores/session'
import { fetchCapabilities } from '../db'

/**
 * The capabilities query definition — every reader passes this same
 * factory to `useQuery`, sharing one cache entry.
 *
 * Keyed off the session user id and disabled until it resolves: firing before
 * auth restores would hit RLS as an anon caller and cache an empty result.
 * Folding the id into the key re-runs the read once the session lands.
 */
export const capabilitiesQuery = () => {
  const session = useSessionStore()
  return {
    key: ['capabilities', session.user?.id ?? ''],
    query: fetchCapabilities,
    enabled: Boolean(session.user?.id)
  }
}

export function useCapabilitiesQuery() {
  return useQuery(capabilitiesQuery)
}
