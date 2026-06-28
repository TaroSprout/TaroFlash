import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { ref } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockUseAllCardsInDeckQuery } = vi.hoisted(() => ({
  mockUseAllCardsInDeckQuery: vi.fn()
}))

vi.mock('@/api/cards', () => ({
  useAllCardsInDeckQuery: mockUseAllCardsInDeckQuery
}))

// ── Imports ───────────────────────────────────────────────────────────────────

import { useCardSort } from '@/views/deck/composables/card-sort'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCard(id, difficulty = undefined) {
  return {
    id,
    client_id: String(id),
    front_text: `Card ${id}`,
    back_text: '',
    review: difficulty !== undefined ? { difficulty } : undefined
  }
}

function makeQuery({ data = [], isLoading = false } = {}) {
  return { data: ref(data), isLoading: ref(isLoading) }
}

function makeSort({
  all_cards = [],
  sort_by = 'default',
  queryData = [],
  queryLoading = false
} = {}) {
  mockUseAllCardsInDeckQuery.mockReturnValue(
    makeQuery({ data: queryData, isLoading: queryLoading })
  )
  const all_cards_ref = ref(all_cards)
  const sort_by_ref = ref(sort_by)
  return {
    sort: useCardSort(1, all_cards_ref, sort_by_ref),
    all_cards_ref,
    sort_by_ref
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useCardSort', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAllCardsInDeckQuery.mockReturnValue(makeQuery())
  })

  // ── is_active ──────────────────────────────────────────────────────────────

  describe('is_active', () => {
    test('is false when sort_by is default [obligation]', () => {
      const { sort } = makeSort({ sort_by: 'default' })
      expect(sort.is_active.value).toBe(false)
    })

    test('is true when sort_by is a non-default key', () => {
      const { sort } = makeSort({ sort_by: 'difficulty' })
      expect(sort.is_active.value).toBe(true)
    })

    test('reacts when sort_by ref changes', () => {
      const { sort, sort_by_ref } = makeSort({ sort_by: 'default' })
      expect(sort.is_active.value).toBe(false)
      sort_by_ref.value = 'difficulty'
      expect(sort.is_active.value).toBe(true)
    })
  })

  // ── Full-deck query gating ─────────────────────────────────────────────────

  describe('useAllCardsInDeckQuery enabled gate', () => {
    test('passes is_active as the enabled ref — query is gated on sort being on [obligation]', () => {
      makeSort({ sort_by: 'default' })
      const [, enabled] = mockUseAllCardsInDeckQuery.mock.calls[0]
      // enabled is a computed ref; when sort is default it should be false
      expect(enabled.value).toBe(false)
    })

    test('enabled gate becomes true when sort_by is non-default [obligation]', () => {
      makeSort({ sort_by: 'difficulty' })
      const [, enabled] = mockUseAllCardsInDeckQuery.mock.calls[0]
      expect(enabled.value).toBe(true)
    })

    test('passes the deck_id as the first argument to useAllCardsInDeckQuery', () => {
      mockUseAllCardsInDeckQuery.mockReturnValue(makeQuery())
      useCardSort(42, ref([]), ref('difficulty'))
      expect(mockUseAllCardsInDeckQuery).toHaveBeenCalledWith(42, expect.anything())
    })
  })

  // ── displayed_cards — default sort (no-op) ─────────────────────────────────

  describe('displayed_cards when sort is default', () => {
    test('returns the all_cards ref value unchanged (same reference) [obligation]', () => {
      const cards = [makeCard(1), makeCard(2)]
      const all_cards_ref = ref(cards)
      mockUseAllCardsInDeckQuery.mockReturnValue(makeQuery())
      const sort = useCardSort(1, all_cards_ref, ref('default'))
      // Must be the exact same array — no copy or sort pass
      expect(sort.displayed_cards.value).toBe(all_cards_ref.value)
    })

    test('tracks all_cards reactively when sort is default', () => {
      const { sort, all_cards_ref } = makeSort({ all_cards: [], sort_by: 'default' })
      all_cards_ref.value = [makeCard(1)]
      // Vue wraps the array in a reactive Proxy; compare against the ref's own value
      expect(sort.displayed_cards.value).toBe(all_cards_ref.value)
    })
  })

  // ── displayed_cards — difficulty sort ──────────────────────────────────────

  describe('displayed_cards when sort is difficulty', () => {
    test('returns empty array when full-deck query data is null or undefined (covers ?? [] branch)', () => {
      // Covers the `full.data.value ?? []` fallback branch
      mockUseAllCardsInDeckQuery.mockReturnValue({ data: ref(null), isLoading: ref(true) })
      const sort = useCardSort(1, ref([]), ref('difficulty'))
      expect(sort.displayed_cards.value).toEqual([])
    })

    test('returns sorted cards from the full-deck query', () => {
      const cards = [makeCard(1, 3), makeCard(2, 7), makeCard(3, 1)]
      const { sort } = makeSort({ sort_by: 'difficulty', queryData: cards })
      const result = sort.displayed_cards.value
      // Hardest (7) first, then 3, then 1
      expect(result[0].id).toBe(2)
      expect(result[1].id).toBe(1)
      expect(result[2].id).toBe(3)
    })

    test('no-review cards sink to bottom — sorted after all reviewed cards [obligation]', () => {
      const cards = [
        makeCard(10), // no review — should sink
        makeCard(20, 5), // difficulty 5
        makeCard(30, 2), // difficulty 2
        makeCard(40) // no review — should sink
      ]
      const { sort } = makeSort({ sort_by: 'difficulty', queryData: cards })
      const result = sort.displayed_cards.value
      // Reviewed cards first (highest difficulty first), then no-review cards
      expect(result[0].id).toBe(20) // diff 5
      expect(result[1].id).toBe(30) // diff 2
      // Last two are no-review (order between them is stable but both come after)
      expect([result[2].id, result[3].id]).toContain(10)
      expect([result[2].id, result[3].id]).toContain(40)
    })

    test('no-review card placed before reviewed card in input — still sinks after all reviewed cards [obligation]', () => {
      // Specifically tests input-order independence (the obligation)
      const cards = [
        makeCard(99), // no review — first in input
        makeCard(1, 0.1) // very low difficulty but HAS a review
      ]
      const { sort } = makeSort({ sort_by: 'difficulty', queryData: cards })
      const result = sort.displayed_cards.value
      // Reviewed card (id=1, diff=0.1) beats no-review (id=99) regardless of input order
      expect(result[0].id).toBe(1)
      expect(result[1].id).toBe(99)
    })

    test('tags each card with client_id = String(card.id)', () => {
      const cards = [{ id: 7, front_text: 'a', review: { difficulty: 5 } }]
      const { sort } = makeSort({ sort_by: 'difficulty', queryData: cards })
      expect(sort.displayed_cards.value[0].client_id).toBe('7')
    })

    test('does not mutate the original all_cards when sort is active', () => {
      const paginated = [makeCard(1), makeCard(2)]
      const all_cards_ref = ref(paginated)
      const queryCards = [makeCard(3, 5), makeCard(4, 2)]
      mockUseAllCardsInDeckQuery.mockReturnValue(makeQuery({ data: queryCards }))
      const sort = useCardSort(1, all_cards_ref, ref('difficulty'))
      // displayed_cards should come from the query, not all_cards
      expect(sort.displayed_cards.value.map((c) => c.id)).not.toContain(1)
    })
  })

  // ── is_loading ─────────────────────────────────────────────────────────────

  describe('is_loading', () => {
    test('is false when sort is default even if query is loading', () => {
      const { sort } = makeSort({ sort_by: 'default', queryLoading: true })
      expect(sort.is_loading.value).toBe(false)
    })

    test('is false when sort is active but query is not loading', () => {
      const { sort } = makeSort({ sort_by: 'difficulty', queryLoading: false })
      expect(sort.is_loading.value).toBe(false)
    })

    test('is true when sort is active AND query is loading', () => {
      const { sort } = makeSort({ sort_by: 'difficulty', queryLoading: true })
      expect(sort.is_loading.value).toBe(true)
    })
  })

  // ── Composition with useCardSearch (idle list contract) ────────────────────

  describe('composition with useCardSearch', () => {
    test('displayed_cards is the sorted full-deck list when sort is active but search is inactive [obligation]', () => {
      // This verifies displayed_cards is suitable to be passed as all_cards to useCardSearch.
      // When sort=active, search=inactive: grid sees the sorted full-deck list.
      const queryCards = [makeCard(1, 5), makeCard(2, 8)]
      const { sort } = makeSort({ sort_by: 'difficulty', queryData: queryCards })
      // Sorted by difficulty desc: id=2 (8) first, id=1 (5) second
      expect(sort.displayed_cards.value[0].id).toBe(2)
      expect(sort.displayed_cards.value[1].id).toBe(1)
    })

    test('displayed_cards is the paginated all_cards when sort is default — search idle-list is unpaged deck [obligation]', () => {
      const all_cards_ref = ref([makeCard(5), makeCard(6)])
      mockUseAllCardsInDeckQuery.mockReturnValue(makeQuery())
      const sort = useCardSort(1, all_cards_ref, ref('default'))
      // When sort=default and search is inactive, grid sees the paginated list unchanged.
      // Vue wraps the array in a reactive Proxy; compare against the ref's own value.
      expect(sort.displayed_cards.value).toBe(all_cards_ref.value)
    })
  })
})
