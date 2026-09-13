import { useQuery } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'
import { fetchCapabilityGrants } from '../db'

export function useCapabilityGrantsQuery(key: MaybeRefOrGetter<CapabilityKey>) {
  return useQuery({
    key: () => ['capability-grants', toValue(key)],
    query: () => fetchCapabilityGrants(toValue(key))
  })
}
