import { useMutation, useQueryCache } from '@pinia/colada'
import { updateCapabilitySwitch, type UpdateCapabilitySwitchParams } from '../db'
import { useSessionStore } from '@/stores/session'

type QueryCache = ReturnType<typeof useQueryCache>
type SwitchesSnapshot = CapabilitySwitch[] | undefined

/**
 * Flips the switch row in the cache the instant it's toggled, so the control
 * responds under the finger. `onError` restores the exact snapshot rather than
 * flipping the flag back, in case another write raced in between.
 */
function setSwitchInCache(
  queryCache: QueryCache,
  cache_key: string[],
  params: UpdateCapabilitySwitchParams
): SwitchesSnapshot {
  const snapshot = queryCache.getQueryData(cache_key) as SwitchesSnapshot
  if (!snapshot) return undefined

  queryCache.setQueryData(
    cache_key,
    snapshot.map((row) => (row.key === params.key ? { ...row, state: params.state } : row))
  )

  return snapshot
}

/** Flips a capability switch. Refused server-side for anyone but an admin. */
export function useUpdateCapabilitySwitchMutation() {
  const queryCache = useQueryCache()
  const session = useSessionStore()

  return useMutation({
    mutation: (params: UpdateCapabilitySwitchParams) => updateCapabilitySwitch(params),
    onMutate: (params: UpdateCapabilitySwitchParams) => {
      const cache_key = ['capability-switches', session.user?.id ?? '']
      return { cache_key, snapshot: setSwitchInCache(queryCache, cache_key, params) }
    },
    onError: (_error, _params, { cache_key, snapshot }) => {
      if (snapshot) queryCache.setQueryData(cache_key, snapshot)
    },
    onSettled: () => queryCache.invalidateQueries({ key: ['capability-switches'] })
  })
}
