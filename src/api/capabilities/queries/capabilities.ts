import { useQuery } from '@pinia/colada'
import { useSessionStore } from '@/stores/session'
import { fetchCapabilities } from '../db'

/** Keyed on the session user id and disabled until auth resolves, so it never fires as an anon caller and caches an empty result. */
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
