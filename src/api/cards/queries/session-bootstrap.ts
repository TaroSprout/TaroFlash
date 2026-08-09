import { useQuery } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'
import { fetchSessionBootstrap } from '../db'

/**
 * Everything a study session opens with — the decks, and their cards merged
 * into one pile — in a single request.
 */
export function useSessionBootstrapQuery(deck_ids: MaybeRefOrGetter<number[]>) {
  return useQuery({
    key: () => ['cards', 'session-bootstrap', toValue(deck_ids)],
    query: () => fetchSessionBootstrap(toValue(deck_ids)),
    // Asked for by hand: a session must open on the server's answer, never a stored one.
    enabled: () => false
  })
}
