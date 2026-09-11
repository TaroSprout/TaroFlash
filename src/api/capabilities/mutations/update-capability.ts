import { useMutation, useQueryCache } from '@pinia/colada'
import { updateCapability, type UpdateCapabilityParams } from '../db'
import { useSessionStore } from '@/stores/session'

type QueryCache = ReturnType<typeof useQueryCache>
type CapabilitiesSnapshot = Capability[] | undefined

function setCapabilityInCache(
  queryCache: QueryCache,
  cache_key: string[],
  params: UpdateCapabilityParams
): CapabilitiesSnapshot {
  const snapshot = queryCache.getQueryData(cache_key) as CapabilitiesSnapshot
  if (!snapshot) return undefined

  const next = snapshot.map((row) =>
    row.key === params.key ? { ...row, state: params.state } : row
  )
  queryCache.setQueryData(cache_key, next)

  return snapshot
}

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
