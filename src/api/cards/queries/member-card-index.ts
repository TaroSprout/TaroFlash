import { useQuery } from '@pinia/colada'
import { fetchMemberCardIndex } from '../db'

export type { CardIndexEntry } from '../db'

// Member-wide index of every distinct card front + its decks. Fetched once and
// reused across every lesson in the session; invalidated by card mutations.
export function useMemberCardIndexQuery() {
  return useQuery({
    key: () => ['cards', 'index'],
    query: () => fetchMemberCardIndex()
  })
}
