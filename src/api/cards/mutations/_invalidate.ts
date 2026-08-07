import type { useQueryCache } from '@pinia/colada'

type QueryCache = ReturnType<typeof useQueryCache>

// Pinia Colada's invalidateQueries only refetches active queries by default;
// non-active queries get marked stale but cached pages stay until a remount.
// Pass `refetch_inactive: true` when the caller might be invalidating a deck
// the user isn't currently viewing (e.g. cross-deck moves) — otherwise the
// user navigates back to stale cached data.
type InvalidateOptions = {
  refetch_inactive?: boolean
  // Set false when the caller already holds the written row on screen and only
  // the deck's own counts need re-reading.
  card_pages?: boolean
}

export function invalidateDeck(
  queryCache: QueryCache,
  deck_id: number | undefined,
  { refetch_inactive = false, card_pages = true }: InvalidateOptions = {}
) {
  if (deck_id === undefined) return

  const refetch = refetch_inactive ? 'all' : true

  queryCache.invalidateQueries({ key: ['deck', deck_id] }, refetch)
  if (card_pages) queryCache.invalidateQueries({ key: ['cards', deck_id] }, refetch)
}

// `exact` on the deck list: a bare `['decks']` filter is a prefix match, so it
// also catches `['decks', 'count']` — the member's *deck* count, which no card
// write can change. Without it every card insert/delete/move refires that HEAD
// query for nothing.
export function invalidateAllCardCounts(queryCache: QueryCache) {
  queryCache.invalidateQueries({ key: ['cards', 'count'] })
  queryCache.invalidateQueries({ key: ['decks'], exact: true })
}

// The member-wide card index (front text → decks) drifts whenever a card is
// created, deleted, has its front edited, or moves decks. Marks the query stale;
// it only refetches while a lesson is actually mounted.
export function invalidateCardIndex(queryCache: QueryCache) {
  queryCache.invalidateQueries({ key: ['cards', 'index'] })
}
