import { useQuery } from '@pinia/colada'
import { fetchMemberDeckCount } from '../db'

// Long, because this is asked once per card row on screen. Creating, deleting or
// moving a deck already reloads it — this is only the backstop.
const STALE_TIME = 1000 * 60 * 5

/**
 * One shared definition of the count entry, so a non-mounting reader (the
 * upsert mutation's limit re-check) can reach the same cache entry through
 * `queryCache.ensure` instead of standing up a second `useQuery`. Every
 * `useQuery`/`ensure` call overwrites the entry's options wholesale, so a
 * second definition carrying different options silently rewrites the behaviour
 * of the one already mounted — including whether an invalidation refetches it.
 * Trap: last mount's options win for every reader of this key
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
