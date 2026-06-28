import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { ref } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockEmitSfx } = vi.hoisted(() => ({
  mockEmitSfx: vi.fn()
}))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

// ── Imports ───────────────────────────────────────────────────────────────────

import { useCardSearch } from '@/views/deck/composables/card-search'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCardSearch({ query_val = '', all_cards = [], is_querying = false } = {}) {
  const query_ref = ref(query_val)
  const all_cards_ref = ref(all_cards)
  const is_querying_ref = ref(is_querying)
  const search = useCardSearch(query_ref, all_cards_ref, is_querying_ref)
  return { search, query_ref, all_cards_ref, is_querying_ref }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useCardSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── is_active ──────────────────────────────────────────────────────────────

  describe('is_active', () => {
    test('is false when is_searching is false even if query has text [obligation]', () => {
      const { search, query_ref } = makeCardSearch()
      query_ref.value = 'hello'
      expect(search.is_active.value).toBe(false)
    })

    test('is false when is_searching is true but query is empty [obligation]', () => {
      const { search } = makeCardSearch()
      search.is_searching.value = true
      expect(search.is_active.value).toBe(false)
    })

    test('is false when is_searching is true but query is whitespace only [obligation]', () => {
      const { search, query_ref } = makeCardSearch()
      search.is_searching.value = true
      query_ref.value = '   '
      expect(search.is_active.value).toBe(false)
    })

    test('is true when is_searching is true AND query has non-empty trimmed value [obligation]', () => {
      const { search, query_ref } = makeCardSearch()
      search.is_searching.value = true
      query_ref.value = 'hello'
      expect(search.is_active.value).toBe(true)
    })

    test('is true when query has leading/trailing spaces but non-empty trimmed content', () => {
      const { search, query_ref } = makeCardSearch()
      search.is_searching.value = true
      query_ref.value = '  hi  '
      expect(search.is_active.value).toBe(true)
    })
  })

  // ── displayed_cards — direct alias of all_cards ────────────────────────────

  describe('displayed_cards', () => {
    test('is the same reference as all_cards_ref, not a computed copy [obligation]', () => {
      const cards = [{ id: 1, client_id: 'c1' }]
      const { search, all_cards_ref } = makeCardSearch({ all_cards: cards })
      expect(search.displayed_cards).toBe(all_cards_ref)
    })

    test('reflects all_cards reactively when all_cards_ref changes [obligation]', () => {
      const { search, all_cards_ref } = makeCardSearch({ all_cards: [{ id: 1, client_id: 'c1' }] })
      all_cards_ref.value = [
        { id: 2, client_id: 'c2' },
        { id: 3, client_id: 'c3' }
      ]
      expect(search.displayed_cards.value).toHaveLength(2)
      expect(search.displayed_cards.value[0].id).toBe(2)
    })

    test('returns all_cards when not searching', () => {
      const cards = [
        { id: 1, client_id: 'c1' },
        { id: 2, client_id: 'c2' }
      ]
      const { search } = makeCardSearch({ all_cards: cards })
      expect(search.displayed_cards.value).toEqual(cards)
    })

    test('still returns all_cards when is_active is true (filtering is server-side)', () => {
      const cards = [{ id: 99, client_id: 'c99' }]
      const { search, query_ref } = makeCardSearch({ all_cards: cards })
      search.is_searching.value = true
      query_ref.value = 'something'
      expect(search.displayed_cards.value).toEqual(cards)
    })
  })

  // ── is_loading ─────────────────────────────────────────────────────────────

  describe('is_loading', () => {
    test('is false when is_active is false even if is_querying is true [obligation]', () => {
      const { search } = makeCardSearch({ is_querying: true })
      // is_searching is false → is_active = false
      expect(search.is_loading.value).toBe(false)
    })

    test('is false when search bar is open but query is empty (is_active = false) [obligation]', () => {
      const { search } = makeCardSearch({ is_querying: true })
      search.is_searching.value = true
      // query is '' → is_active = false
      expect(search.is_loading.value).toBe(false)
    })

    test('is false when is_active is true but is_querying is false [obligation]', () => {
      const { search, query_ref } = makeCardSearch({ is_querying: false })
      search.is_searching.value = true
      query_ref.value = 'q'
      expect(search.is_loading.value).toBe(false)
    })

    test('is true ONLY when BOTH is_active AND is_querying are true [obligation]', () => {
      const { search, query_ref } = makeCardSearch({ is_querying: true })
      search.is_searching.value = true
      query_ref.value = 'q'
      expect(search.is_loading.value).toBe(true)
    })

    test('tracks is_querying_ref reactively', () => {
      const { search, query_ref, is_querying_ref } = makeCardSearch({ is_querying: false })
      search.is_searching.value = true
      query_ref.value = 'q'
      expect(search.is_loading.value).toBe(false)

      is_querying_ref.value = true
      expect(search.is_loading.value).toBe(true)

      is_querying_ref.value = false
      expect(search.is_loading.value).toBe(false)
    })
  })

  // ── no_results ─────────────────────────────────────────────────────────────

  describe('no_results', () => {
    test('is false when not active (is_searching=false) [obligation]', () => {
      const { search } = makeCardSearch({ all_cards: [] })
      expect(search.no_results.value).toBe(false)
    })

    test('is false when active but still loading [obligation]', () => {
      const { search, query_ref } = makeCardSearch({ is_querying: true, all_cards: [] })
      search.is_searching.value = true
      query_ref.value = 'q'
      // is_loading = true, so no_results = false
      expect(search.no_results.value).toBe(false)
    })

    test('is false when active and not loading but all_cards has entries [obligation]', () => {
      const { search, query_ref } = makeCardSearch({
        is_querying: false,
        all_cards: [{ id: 1, client_id: 'c1' }]
      })
      search.is_searching.value = true
      query_ref.value = 'q'
      expect(search.no_results.value).toBe(false)
    })

    test('is true ONLY when is_active AND !is_loading AND all_cards.length === 0 [obligation]', () => {
      const { search, query_ref } = makeCardSearch({ is_querying: false, all_cards: [] })
      search.is_searching.value = true
      query_ref.value = 'noresult'
      expect(search.no_results.value).toBe(true)
    })

    test('transitions from true to false when a new card appears in all_cards', () => {
      const { search, query_ref, all_cards_ref } = makeCardSearch({
        is_querying: false,
        all_cards: []
      })
      search.is_searching.value = true
      query_ref.value = 'q'
      expect(search.no_results.value).toBe(true)

      all_cards_ref.value = [{ id: 1, client_id: 'c1' }]
      expect(search.no_results.value).toBe(false)
    })
  })

  // ── query alias — shared ref contract ─────────────────────────────────────

  describe('query alias', () => {
    test('search.query is the same ref object as query_ref passed in [obligation]', () => {
      const { search, query_ref } = makeCardSearch()
      expect(search.query).toBe(query_ref)
    })

    test('writing search.query.value updates query_ref.value', () => {
      const { search, query_ref } = makeCardSearch()
      search.query.value = 'typed text'
      expect(query_ref.value).toBe('typed text')
    })

    test('writing query_ref.value is visible via search.query.value', () => {
      const { search, query_ref } = makeCardSearch()
      query_ref.value = 'from outside'
      expect(search.query.value).toBe('from outside')
    })
  })

  // ── open / close / toggle ──────────────────────────────────────────────────

  describe('open()', () => {
    test('sets is_searching to true [obligation]', () => {
      const { search } = makeCardSearch()
      search.open()
      expect(search.is_searching.value).toBe(true)
    })

    test('emits generic_button_15 sfx [obligation]', () => {
      const { search } = makeCardSearch()
      search.open()
      expect(mockEmitSfx).toHaveBeenCalledWith('generic_button_15')
    })
  })

  describe('close()', () => {
    test('sets is_searching to false [obligation]', () => {
      const { search } = makeCardSearch()
      search.is_searching.value = true
      search.close()
      expect(search.is_searching.value).toBe(false)
    })

    test('writes empty string back to the shared query_ref — NOT a local copy [obligation]', () => {
      const { search, query_ref } = makeCardSearch({ query_val: 'previous text' })
      search.close()
      // The shared ref must be cleared, not just a local copy
      expect(query_ref.value).toBe('')
    })

    test('search.query.value (the alias) also reads as empty after close [obligation]', () => {
      const { search } = makeCardSearch({ query_val: 'text' })
      search.close()
      expect(search.query.value).toBe('')
    })

    test('emits slide_left sfx [obligation]', () => {
      const { search } = makeCardSearch()
      search.close()
      expect(mockEmitSfx).toHaveBeenCalledWith('slide_left')
    })
  })

  describe('toggle()', () => {
    test('calls open() when is_searching is false', () => {
      const { search } = makeCardSearch()
      search.is_searching.value = false
      search.toggle()
      expect(search.is_searching.value).toBe(true)
      expect(mockEmitSfx).toHaveBeenCalledWith('generic_button_15')
    })

    test('calls close() when is_searching is true [obligation]', () => {
      const { search, query_ref } = makeCardSearch({ query_val: 'something' })
      search.is_searching.value = true
      search.toggle()
      expect(search.is_searching.value).toBe(false)
      expect(query_ref.value).toBe('')
      expect(mockEmitSfx).toHaveBeenCalledWith('slide_left')
    })
  })
})
