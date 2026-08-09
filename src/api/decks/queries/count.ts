import { useQuery } from '@pinia/colada'
import { fetchMemberDeckCount } from '../db'

// Long, because this is asked once per card row on screen. Creating, deleting or
// moving a deck already reloads it — this is only the backstop.
const STALE_TIME = 1000 * 60 * 5

export function useMemberDeckCountQuery() {
  return useQuery({
    key: ['decks', 'count'],
    query: fetchMemberDeckCount,
    staleTime: STALE_TIME
  })
}
