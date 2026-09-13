import { useQuery } from '@pinia/colada'
import { useSessionStore } from '@/stores/session'
import { fetchResolvedCapabilities } from '../db'

/** Keyed on the session user id and disabled until auth resolves, so it never fires as an anon caller and caches an empty result. */
export const resolvedCapabilitiesQuery = () => {
  const session = useSessionStore()
  return {
    key: ['capabilities', 'resolved', session.user?.id ?? ''],
    query: fetchResolvedCapabilities,
    enabled: Boolean(session.user?.id)
  }
}

export function useResolvedCapabilitiesQuery() {
  return useQuery(resolvedCapabilitiesQuery)
}
