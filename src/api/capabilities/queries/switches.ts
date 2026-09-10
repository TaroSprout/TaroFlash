import { useQuery } from '@pinia/colada'
import { useSessionStore } from '@/stores/session'
import { fetchCapabilitySwitches } from '../db'

/**
 * The one place the capability-switches query is defined. Keyed off the session
 * store's user id, and disabled until it resolves: at a cold load the id is
 * briefly undefined, and firing the read before auth restores would hit RLS as
 * an anon caller and cache an empty result. Folding the id into the key means
 * the read re-runs — and every `isLive` reader re-derives — the moment the
 * session lands. Every reader passes this same constant to `useQuery`, so they
 * share one cache entry.
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
