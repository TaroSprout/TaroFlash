import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import {
  invalidateDeck,
  invalidateAllCardCounts,
  invalidateCardIndex
} from '@/api/cards/mutations/_invalidate'

function makeCache() {
  return { invalidateQueries: vi.fn() }
}

describe('invalidateDeck', () => {
  let cache
  beforeEach(() => {
    cache = makeCache()
  })

  test('no-ops when deck_id is undefined — cards without a deck should not invalidate anything', () => {
    invalidateDeck(cache, undefined)
    expect(cache.invalidateQueries).not.toHaveBeenCalled()
  })

  test('invalidates ["deck", id] so the detail view refetches', () => {
    invalidateDeck(cache, 42)
    expect(cache.invalidateQueries).toHaveBeenCalledWith({ key: ['deck', 42] })
  })

  test('invalidates ["cards", id] — prefix match covers infinite pages, ids + search variants', () => {
    invalidateDeck(cache, 42)
    // Pinia Colada matches by prefix unless `exact: true`, so this single call
    // refetches every nested entry: ['cards', 42, 'pages', N],
    // ['cards', 42, 'ids'], and ['cards', 42, 'search', q].
    expect(cache.invalidateQueries).toHaveBeenCalledWith({ key: ['cards', 42] })
  })

  test('fires exactly two invalidations per deck_id by default', () => {
    invalidateDeck(cache, 42)
    expect(cache.invalidateQueries).toHaveBeenCalledTimes(2)
  })

  // Regression: cross-deck moves invalidate decks the user may not currently
  // be viewing. Default refetchActive only refetches active queries — inactive
  // queries get marked stale but kept their cached pages, so the user sees
  // stale data on re-entry. `refetch_inactive: true` forces refetch.
  test('refetch_inactive: true passes "all" so inactive queries refetch too', () => {
    invalidateDeck(cache, 42, { refetch_inactive: true })
    expect(cache.invalidateQueries).toHaveBeenCalledWith({ key: ['deck', 42] }, 'all')
    expect(cache.invalidateQueries).toHaveBeenCalledWith({ key: ['cards', 42] }, 'all')
  })

  // card_pages defaults to true — a caller that doesn't pass it
  // still gets its card pages refetched (the pre-eager-insert behaviour).
  test('card_pages defaults to true — cards key is invalidated unless explicitly suppressed', () => {
    invalidateDeck(cache, 42)
    expect(cache.invalidateQueries).toHaveBeenCalledWith({ key: ['cards', 42] })
    expect(cache.invalidateQueries).toHaveBeenCalledTimes(2)
  })

  // the eager-insert caller already holds the written row on
  // screen — only the deck's own counts need re-reading, so card_pages: false
  // must skip the ['cards', id] invalidation entirely.
  test('card_pages: false skips the ["cards", id] invalidation, only the deck key fires', () => {
    invalidateDeck(cache, 42, { card_pages: false })
    expect(cache.invalidateQueries).toHaveBeenCalledWith({ key: ['deck', 42] })
    expect(cache.invalidateQueries).toHaveBeenCalledTimes(1)
  })

  // the refetch_inactive rewrite must still cover both branches —
  // 'all' propagates to the deck invalidation even when card_pages is false.
  test('refetch_inactive + card_pages: false still passes "all" to the deck invalidation', () => {
    invalidateDeck(cache, 42, { refetch_inactive: true, card_pages: false })
    expect(cache.invalidateQueries).toHaveBeenCalledWith({ key: ['deck', 42] }, 'all')
    expect(cache.invalidateQueries).toHaveBeenCalledTimes(1)
  })
})

describe('invalidateAllCardCounts', () => {
  let cache
  beforeEach(() => {
    cache = makeCache()
  })

  test('invalidates ["cards", "count"] so every member-card-count query refetches', () => {
    invalidateAllCardCounts(cache)
    expect(cache.invalidateQueries).toHaveBeenCalledWith({ key: ['cards', 'count'] })
  })

  test('invalidates ["decks"] because decks_with_stats exposes card counts per deck', () => {
    invalidateAllCardCounts(cache)
    expect(cache.invalidateQueries).toHaveBeenCalledWith({ key: ['decks'], exact: true })
  })

  // a bare `['decks']` prefix filter also matches `['decks', 'count']`
  // — the member's *deck* count, which no card write can change. `exact: true`
  // is the guard against refiring that query on every card insert/delete/move.
  test('decks invalidation is exact, not a prefix — does not also match ["decks", "count"]', () => {
    invalidateAllCardCounts(cache)
    expect(cache.invalidateQueries).not.toHaveBeenCalledWith({ key: ['decks'] })
    expect(cache.invalidateQueries).not.toHaveBeenCalledWith({ key: ['decks', 'count'] })
  })
})

describe('invalidateCardIndex', () => {
  let cache
  beforeEach(() => {
    cache = makeCache()
  })

  test('invalidates ["cards", "index"] — the member-wide term→decks lookup', () => {
    invalidateCardIndex(cache)
    expect(cache.invalidateQueries).toHaveBeenCalledWith({ key: ['cards', 'index'] })
  })

  test('fires exactly one invalidation (narrow key, not a broad sweep)', () => {
    invalidateCardIndex(cache)
    expect(cache.invalidateQueries).toHaveBeenCalledTimes(1)
  })
})
