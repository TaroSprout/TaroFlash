import type { useQueryCache } from '@pinia/colada'

type QueryCache = ReturnType<typeof useQueryCache>

type InvalidateOptions = {
  // Reload decks you aren't looking at as well, so one you open next is already right.
  refetch_inactive?: boolean
  // False when the row on screen is already correct and only the counts moved.
  card_pages?: boolean
}

export function invalidateDeck(
  queryCache: QueryCache,
  deck_id: number | undefined,
  { refetch_inactive = false, card_pages = true }: InvalidateOptions = {}
) {
  if (deck_id === undefined) return

  if (refetch_inactive) {
    queryCache.invalidateQueries({ key: ['deck', deck_id] }, 'all')
    if (card_pages) queryCache.invalidateQueries({ key: ['cards', deck_id] }, 'all')
    return
  }

  queryCache.invalidateQueries({ key: ['deck', deck_id] })
  if (card_pages) queryCache.invalidateQueries({ key: ['cards', deck_id] })
}

// `exact` keeps this off the deck *count*, which no card write can ever change.
export function invalidateAllCardCounts(queryCache: QueryCache) {
  queryCache.invalidateQueries({ key: ['cards', 'count'] })
  queryCache.invalidateQueries({ key: ['decks'], exact: true })
}

// Marks the index stale. It only reloads while a lesson is open to use it.
export function invalidateCardIndex(queryCache: QueryCache) {
  queryCache.invalidateQueries({ key: ['cards', 'index'] })
}
