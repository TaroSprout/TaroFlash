import { useQuery } from '@pinia/colada'
import { fetchMemberDeckCount } from '../db'

// `useCan()` instantiates this query, and `useCan()` is mounted per card face
// editor — so the default 5s staleTime made every newly rendered card row
// refetch the member's deck count. The count only moves when a deck is created,
// deleted or moved, and all three invalidate `['decks']` (a prefix match that
// catches this key), so explicit invalidation carries the freshness. This is
// just the backstop for a case that misses.
const STALE_TIME = 1000 * 60 * 5

export function useMemberDeckCountQuery() {
  return useQuery({
    key: ['decks', 'count'],
    query: fetchMemberDeckCount,
    staleTime: STALE_TIME
  })
}
