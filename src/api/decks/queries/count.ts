import { useQuery } from '@pinia/colada'
import { fetchMemberDeckCount } from '../db'

// `useCan()` instantiates this query, and `useCan()` is mounted per card face
// editor — so a default 5s staleTime made every newly rendered card row refetch
// the member's deck count. The count only moves when a deck is created, deleted
// or moved, and all three invalidate `['decks']` (a prefix match that catches
// this key), so explicit invalidation is the only freshness this needs.
export function useMemberDeckCountQuery() {
  return useQuery({
    key: ['decks', 'count'],
    query: fetchMemberDeckCount,
    staleTime: Infinity
  })
}
