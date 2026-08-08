import type { useQueryCache } from '@pinia/colada'

type QueryCache = ReturnType<typeof useQueryCache>

// A write flags every affected deck's data as out of date, but only
// re-downloads the deck on screen. `refetch_inactive: true` re-downloads the
// off-screen ones too, so a deck you're not looking at (after moving cards out
// of it) is already right when you open it, rather than showing the old list
// for a beat first.
type InvalidateOptions = {
  refetch_inactive?: boolean
  // Set false when the write's row is already correct on screen, so only the
  // deck's counts need re-reading and the card list can be left alone.
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

// `exact` on the deck list: keys match by prefix, so a bare `['decks']` also
// catches `['decks', 'count']` — how many decks the member owns, which adding
// or removing a *card* can never change. Without it every card write re-counts
// the member's decks for nothing.
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
