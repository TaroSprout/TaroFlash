import type { useQueryCache } from '@pinia/colada'

type QueryCache = ReturnType<typeof useQueryCache>

// Pinia Colada's invalidateQueries only refetches active queries by default;
// non-active queries get marked stale but cached pages stay until a remount.
// Pass `refetch_inactive: true` when the caller might be invalidating a deck
// the user isn't currently viewing (e.g. cross-deck moves) — otherwise the
// user navigates back to stale cached data.
type InvalidateOptions = { refetch_inactive?: boolean }

export function invalidateDeck(
  queryCache: QueryCache,
  deck_id: number | undefined,
  options: InvalidateOptions = {}
) {
  if (deck_id === undefined) return
  if (options.refetch_inactive) {
    queryCache.invalidateQueries({ key: ['deck', deck_id] }, 'all')
    queryCache.invalidateQueries({ key: ['cards', deck_id] }, 'all')
    return
  }
  queryCache.invalidateQueries({ key: ['deck', deck_id] })
  queryCache.invalidateQueries({ key: ['cards', deck_id] })
}

export function invalidateAllCardCounts(queryCache: QueryCache) {
  queryCache.invalidateQueries({ key: ['cards', 'count'] })
  queryCache.invalidateQueries({ key: ['decks'] })
}
