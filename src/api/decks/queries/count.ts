import { useQuery } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'
import { fetchMemberDeckCount } from '../db'

// Long, because this is asked once per card row on screen. Creating, deleting or
// moving a deck already reloads it — this is only the backstop.
const STALE_TIME = 1000 * 60 * 5

/**
 * `enabled` defaults to true for the common case (a live "can I create
 * another deck" read). A caller that only ever forces a fresh count right
 * before a create — `useUpsertDeckMutation`'s limit re-check — passes
 * `false` so mounting it doesn't also fire an automatic fetch; `.refresh()`
 * still works regardless of `enabled`.
 */
export function useMemberDeckCountQuery(enabled: MaybeRefOrGetter<boolean> = true) {
  return useQuery({
    key: ['decks', 'count'],
    query: fetchMemberDeckCount,
    staleTime: STALE_TIME,
    enabled: () => toValue(enabled)
  })
}
