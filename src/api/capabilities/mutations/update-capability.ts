import { useMutation, useQueryCache } from '@pinia/colada'
import { updateCapability, type UpdateCapabilityParams } from '../db'
import { useSessionStore } from '@/stores/session'

type QueryCache = ReturnType<typeof useQueryCache>
type CapabilitiesSnapshot = Capability[] | undefined

/**
 * Updates the capability row in the cache the instant it's toggled, so the control
 * responds under the finger. `onError` restores the exact snapshot rather than
 * flipping the flag back, in case another write raced in between.
 */
function setCapabilityInCache(
  queryCache: QueryCache,
  cache_key: string[],
  params: UpdateCapabilityParams
): CapabilitiesSnapshot {
  const snapshot = queryCache.getQueryData(cache_key) as CapabilitiesSnapshot
  if (!snapshot) return undefined

  queryCache.setQueryData(
    cache_key,
    snapshot.map((row) => (row.key === params.key ? { ...row, state: params.state } : row))
  )

  return snapshot
}

/** Updates a capability's state. Refused server-side for anyone but an admin. */
export function useUpdateCapabilityMutation() {
  const queryCache = useQueryCache()
  const session = useSessionStore()

  return useMutation({
    mutation: (params: UpdateCapabilityParams) => updateCapability(params),
    onMutate: (params: UpdateCapabilityParams) => {
      const cache_key = ['capabilities', session.user?.id ?? '']
      return { cache_key, snapshot: setCapabilityInCache(queryCache, cache_key, params) }
    },
    onError: (_error, _params, { cache_key, snapshot }) => {
      if (snapshot) queryCache.setQueryData(cache_key, snapshot)
    },
    onSettled: () => queryCache.invalidateQueries({ key: ['capabilities'] })
  })
}
