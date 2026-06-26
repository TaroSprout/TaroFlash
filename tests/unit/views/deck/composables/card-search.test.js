import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { ref } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockEmitSfx, mockUseSearchCardsInDeckQuery } = vi.hoisted(() => ({
  mockEmitSfx: vi.fn(),
  mockUseSearchCardsInDeckQuery: vi.fn()
}))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

vi.mock('@/api/cards', () => ({
  useSearchCardsInDeckQuery: mockUseSearchCardsInDeckQuery
}))

// ── Imports ───────────────────────────────────────────────────────────────────

import { useCardSearch } from '@/views/deck/composables/card-search'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSearchQuery({ data = [], isLoading = false } = {}) {
  return {
    data: ref(data),
    isLoading: ref(isLoading)
  }
}

function makeCardSearch({ all_cards = [], searchQuery = {} } = {}) {
  mockUseSearchCardsInDeckQuery.mockReturnValue(makeSearchQuery(searchQuery))
  return useCardSearch(1, ref(all_cards))
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useCardSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: return an empty search query
    mockUseSearchCardsInDeckQuery.mockReturnValue(makeSearchQuery())
  })

  // ── is_active ──────────────────────────────────────────────────────────────

  describe('is_active', () => {
    test('is false when is_searching is false even if query has text [obligation]', () => {
      const search = makeCardSearch()
      search.query.value = 'hello'
      expect(search.is_active.value).toBe(false)
    })

    test('is false when is_searching is true but query is empty [obligation]', () => {
      const search = makeCardSearch()
      search.is_searching.value = true
      search.query.value = ''
      expect(search.is_active.value).toBe(false)
    })

    test('is false when is_searching is true but query is whitespace only [obligation]', () => {
      const search = makeCardSearch()
      search.is_searching.value = true
      search.query.value = '   '
      expect(search.is_active.value).toBe(false)
    })

    test('is true when is_searching is true AND query has non-empty trimmed value [obligation]', () => {
      const search = makeCardSearch()
      search.is_searching.value = true
      search.query.value = 'hello'
      expect(search.is_active.value).toBe(true)
    })

    test('is true when query has leading/trailing spaces but non-empty trimmed content', () => {
      const search = makeCardSearch()
      search.is_searching.value = true
      search.query.value = '  hi  '
      expect(search.is_active.value).toBe(true)
    })
  })

  // ── displayed_cards ────────────────────────────────────────────────────────

  describe('displayed_cards', () => {
    test('returns all_cards when not active [obligation]', () => {
      const cards = [
        { id: 1, client_id: 'c1' },
        { id: 2, client_id: 'c2' }
      ]
      const search = makeCardSearch({ all_cards: cards })
      expect(search.displayed_cards.value).toStrictEqual(cards)
    })

    test('returns search results when active [obligation]', () => {
      const all_cards = [{ id: 1, client_id: 'c1' }]
      const search = makeCardSearch({
        all_cards,
        searchQuery: { data: [{ id: 99, front_text: 'result' }] }
      })
      search.is_searching.value = true
      search.query.value = 'res'
      expect(search.displayed_cards.value).not.toBe(all_cards)
      expect(search.displayed_cards.value).toHaveLength(1)
      expect(search.displayed_cards.value[0].id).toBe(99)
    })

    test('search results are tagged with client_id = String(card.id) [obligation]', () => {
      const search = makeCardSearch({
        searchQuery: {
          data: [
            { id: 42, front_text: 'foo' },
            { id: 7, front_text: 'bar' }
          ]
        }
      })
      search.is_searching.value = true
      search.query.value = 'foo'
      const cards = search.displayed_cards.value
      expect(cards[0].client_id).toBe('42')
      expect(cards[1].client_id).toBe('7')
    })

    test('client_id uses String() conversion so id=0 maps to "0"', () => {
      const search = makeCardSearch({
        searchQuery: { data: [{ id: 0, front_text: 'zero' }] }
      })
      search.is_searching.value = true
      search.query.value = 'zero'
      expect(search.displayed_cards.value[0].client_id).toBe('0')
    })

    test('returns all_cards when is_searching is true but query is empty', () => {
      const cards = [{ id: 1, client_id: 'c1' }]
      const search = makeCardSearch({
        all_cards: cards,
        searchQuery: { data: [{ id: 99 }] }
      })
      search.is_searching.value = true
      search.query.value = ''
      expect(search.displayed_cards.value).toStrictEqual(cards)
    })
  })

  // ── no_results ─────────────────────────────────────────────────────────────

  describe('no_results', () => {
    test('is false when not active [obligation]', () => {
      const search = makeCardSearch({ searchQuery: { data: [] } })
      expect(search.no_results.value).toBe(false)
    })

    test('is false when active but still loading [obligation]', () => {
      const search = makeCardSearch({ searchQuery: { data: [], isLoading: true } })
      search.is_searching.value = true
      search.query.value = 'q'
      expect(search.no_results.value).toBe(false)
    })

    test('is false when active, not loading, but results exist [obligation]', () => {
      const search = makeCardSearch({
        searchQuery: { data: [{ id: 1 }], isLoading: false }
      })
      search.is_searching.value = true
      search.query.value = 'q'
      expect(search.no_results.value).toBe(false)
    })

    test('is true ONLY when active AND not loading AND results are empty [obligation]', () => {
      const search = makeCardSearch({ searchQuery: { data: [], isLoading: false } })
      search.is_searching.value = true
      search.query.value = 'noresult'
      expect(search.no_results.value).toBe(true)
    })
  })

  // ── is_loading ─────────────────────────────────────────────────────────────

  describe('is_loading', () => {
    test('is false when not active even if query is loading [obligation]', () => {
      const search = makeCardSearch({ searchQuery: { isLoading: true } })
      expect(search.is_loading.value).toBe(false)
    })

    test('is false when active but query is not loading [obligation]', () => {
      const search = makeCardSearch({ searchQuery: { isLoading: false } })
      search.is_searching.value = true
      search.query.value = 'q'
      expect(search.is_loading.value).toBe(false)
    })

    test('is true when active AND query is loading [obligation]', () => {
      const search = makeCardSearch({ searchQuery: { isLoading: true } })
      search.is_searching.value = true
      search.query.value = 'q'
      expect(search.is_loading.value).toBe(true)
    })
  })

  // ── open / close / toggle ──────────────────────────────────────────────────

  describe('open()', () => {
    test('sets is_searching to true [obligation]', () => {
      const search = makeCardSearch()
      search.open()
      expect(search.is_searching.value).toBe(true)
    })

    test('emits generic_button_15 sfx [obligation]', () => {
      const search = makeCardSearch()
      search.open()
      expect(mockEmitSfx).toHaveBeenCalledWith('generic_button_15')
    })
  })

  describe('close()', () => {
    test('sets is_searching to false [obligation]', () => {
      const search = makeCardSearch()
      search.is_searching.value = true
      search.close()
      expect(search.is_searching.value).toBe(false)
    })

    test('clears query to empty string [obligation]', () => {
      const search = makeCardSearch()
      search.query.value = 'previous text'
      search.close()
      expect(search.query.value).toBe('')
    })

    test('emits slide_left sfx [obligation]', () => {
      const search = makeCardSearch()
      search.close()
      expect(mockEmitSfx).toHaveBeenCalledWith('slide_left')
    })
  })

  describe('toggle()', () => {
    test('calls open() when is_searching is false [obligation]', () => {
      const search = makeCardSearch()
      search.is_searching.value = false
      search.toggle()
      expect(search.is_searching.value).toBe(true)
      expect(mockEmitSfx).toHaveBeenCalledWith('generic_button_15')
    })

    test('calls close() when is_searching is true [obligation]', () => {
      const search = makeCardSearch()
      search.is_searching.value = true
      search.query.value = 'something'
      search.toggle()
      expect(search.is_searching.value).toBe(false)
      expect(search.query.value).toBe('')
      expect(mockEmitSfx).toHaveBeenCalledWith('slide_left')
    })
  })

  // ── useSearchCardsInDeckQuery wiring ───────────────────────────────────────

  test('passes deck_id and trimmed query ref to useSearchCardsInDeckQuery', () => {
    const search = makeCardSearch()
    expect(mockUseSearchCardsInDeckQuery).toHaveBeenCalledWith(1, expect.anything())
  })

  test('no_results uses data length, treating undefined as 0', () => {
    // data is undefined (query not yet resolved)
    mockUseSearchCardsInDeckQuery.mockReturnValue({
      data: ref(undefined),
      isLoading: ref(false)
    })
    const search = useCardSearch(1, ref([]))
    search.is_searching.value = true
    search.query.value = 'q'
    expect(search.no_results.value).toBe(true)
  })
})
