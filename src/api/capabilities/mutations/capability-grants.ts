import { useMutation, useQueryCache } from '@pinia/colada'
import { addCapabilityGrant, removeCapabilityGrant, type CapabilityGrantParams } from '../db'

type QueryCache = ReturnType<typeof useQueryCache>
type GrantsSnapshot = CapabilityGrant[] | undefined

export type AddCapabilityGrantVars = {
  key: CapabilityKey
  member: Pick<CapabilityGrant, 'id' | 'display_name' | 'avatar_url'>
}

function addGrantToCache(
  queryCache: QueryCache,
  cache_key: string[],
  member: AddCapabilityGrantVars['member']
): GrantsSnapshot {
  const snapshot = queryCache.getQueryData(cache_key) as GrantsSnapshot
  if (!snapshot) return undefined

  const optimistic: CapabilityGrant = { ...member, granted_at: new Date().toISOString() }
  queryCache.setQueryData(cache_key, [...snapshot, optimistic])

  return snapshot
}

function removeGrantFromCache(
  queryCache: QueryCache,
  cache_key: string[],
  member_id: string
): GrantsSnapshot {
  const snapshot = queryCache.getQueryData(cache_key) as GrantsSnapshot
  if (!snapshot) return undefined

  queryCache.setQueryData(
    cache_key,
    snapshot.filter((grant) => grant.id !== member_id)
  )

  return snapshot
}

export function useAddCapabilityGrantMutation() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: (vars: AddCapabilityGrantVars) =>
      addCapabilityGrant({ key: vars.key, member_id: vars.member.id }),
    onMutate: (vars: AddCapabilityGrantVars) => {
      const cache_key = ['capability-grants', vars.key]
      return { cache_key, snapshot: addGrantToCache(queryCache, cache_key, vars.member) }
    },
    onError: (_error, _vars, { cache_key, snapshot }) => {
      if (snapshot) queryCache.setQueryData(cache_key, snapshot)
    },
    onSettled: () => queryCache.invalidateQueries({ key: ['capability-grants'] })
  })
}

export function useRemoveCapabilityGrantMutation() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: (params: CapabilityGrantParams) => removeCapabilityGrant(params),
    onMutate: (params: CapabilityGrantParams) => {
      const cache_key = ['capability-grants', params.key]
      return { cache_key, snapshot: removeGrantFromCache(queryCache, cache_key, params.member_id) }
    },
    onError: (_error, _params, { cache_key, snapshot }) => {
      if (snapshot) queryCache.setQueryData(cache_key, snapshot)
    },
    onSettled: () => queryCache.invalidateQueries({ key: ['capability-grants'] })
  })
}
