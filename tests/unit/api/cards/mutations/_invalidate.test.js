import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { invalidateDeck, invalidateAllCardCounts } from '@/api/cards/mutations/_invalidate'

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
    expect(cache.invalidateQueries).toHaveBeenCalledWith({ key: ['deck', 42] }, true)
  })

  test('invalidates ["cards", id] — prefix match covers infinite pages, ids + search variants', () => {
    invalidateDeck(cache, 42)
    // Pinia Colada matches by prefix unless `exact: true`, so this single call
    // refetches every nested entry: ['cards', 42, 'pages', N],
    // ['cards', 42, 'ids'], and ['cards', 42, 'search', q].
    expect(cache.invalidateQueries).toHaveBeenCalledWith({ key: ['cards', 42] }, true)
  })

  test('fires exactly two invalidations per deck_id', () => {
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
    expect(cache.invalidateQueries).toHaveBeenCalledWith({ key: ['decks'] })
  })
})
