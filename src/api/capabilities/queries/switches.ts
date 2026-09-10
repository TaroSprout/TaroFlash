import { useQuery } from '@pinia/colada'
import { useSessionStore } from '@/stores/session'
import { fetchCapabilitySwitches } from '../db'

/**
 * The capability-switches query definition — every reader passes this same
 * factory to `useQuery`, sharing one cache entry.
 *
 * Keyed off the session user id and disabled until it resolves: firing before
 * auth restores would hit RLS as an anon caller and cache an empty result.
 * Folding the id into the key re-runs the read once the session lands.
 */
export const capabilitySwitchesQuery = () => {
  const session = useSessionStore()
  return {
    key: ['capability-switches', session.user?.id ?? ''],
    query: fetchCapabilitySwitches,
    enabled: Boolean(session.user?.id)
  }
}

export function useCapabilitySwitchesQuery() {
  return useQuery(capabilitySwitchesQuery)
}
