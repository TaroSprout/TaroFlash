import { useQuery } from '@pinia/colada'
import { type MaybeRefOrGetter, toValue } from 'vue'
import { searchMembers } from '../db'

export function useMemberSearchQuery(term: MaybeRefOrGetter<string>) {
  return useQuery({
    key: () => ['member-search', toValue(term).trim()],
    query: () => searchMembers(toValue(term)),
    enabled: () => toValue(term).trim().length >= 2 // below the server's two-character floor there is nothing to fetch, so don't
  })
}
