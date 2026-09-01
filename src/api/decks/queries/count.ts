import { useQuery } from '@pinia/colada'
import { fetchMemberDeckCount } from '../db'

// Long, because this is asked once per card row on screen. Creating, deleting or
// moving a deck already reloads it — this is only the backstop.
const STALE_TIME = 1000 * 60 * 5

/**
 * The one definition of the deck-count entry. Whichever call site mounts this key last
 * sets the options every other reader gets, including whether an invalidation refetches.
 * →[K:shared-cache-entry-options-last-mount-wins]
 */
export const MEMBER_DECK_COUNT_QUERY = {
  key: ['decks', 'count'],
  query: fetchMemberDeckCount,
  staleTime: STALE_TIME
}

export function useMemberDeckCountQuery() {
  return useQuery(MEMBER_DECK_COUNT_QUERY)
}
