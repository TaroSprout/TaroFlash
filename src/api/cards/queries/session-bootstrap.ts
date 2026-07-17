import { useQuery } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'
import { fetchSessionBootstrap } from '../db'

/**
 * Server-built study-session bootstrap merged across the given decks, in deck
 * order. Returns the resolved decks + the merged study queue in one round-trip;
 * caps + new/review partition stay per deck on the backend.
 */
export function useSessionBootstrapQuery(deck_ids: MaybeRefOrGetter<number[]>) {
  return useQuery({
    key: () => ['cards', 'session-bootstrap', toValue(deck_ids)],
    query: () => fetchSessionBootstrap(toValue(deck_ids))
  })
}
