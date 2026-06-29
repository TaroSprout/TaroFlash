import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { ref } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockFetchMultiDeckStudyCards, mockUseQuery } = vi.hoisted(() => ({
  mockFetchMultiDeckStudyCards: vi.fn(),
  mockUseQuery: vi.fn()
}))

vi.mock('@/api/cards/db', () => ({
  fetchMultiDeckStudyCards: mockFetchMultiDeckStudyCards
}))

vi.mock('@pinia/colada', () => ({
  useQuery: mockUseQuery
}))

// ── Import after mocks ────────────────────────────────────────────────────────

import { useMultiDeckStudyCardsQuery } from '@/api/cards/queries/multi-deck-study-cards'

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useMultiDeckStudyCardsQuery', () => {
  beforeEach(() => {
    mockUseQuery.mockReset()
    mockUseQuery.mockReturnValue({ data: ref(undefined), refetch: vi.fn() })
    mockFetchMultiDeckStudyCards.mockReset()
  })

  test('calls useQuery with the correct key shape', () => {
    const deck_ids = [1, 2, 3]
    const study_all = false

    useMultiDeckStudyCardsQuery(deck_ids, study_all)

    expect(mockUseQuery).toHaveBeenCalledOnce()
    const { key } = mockUseQuery.mock.calls[0][0]
    expect(key()).toEqual(['cards', 'study-session-multi', deck_ids, study_all])
  })

  test('key resolves reactive MaybeRefOrGetter sources', () => {
    const deck_ids = ref([10, 20])
    const study_all = ref(true)

    useMultiDeckStudyCardsQuery(deck_ids, study_all)

    const { key } = mockUseQuery.mock.calls[0][0]
    expect(key()).toEqual(['cards', 'study-session-multi', [10, 20], true])
  })

  test('query function delegates to fetchMultiDeckStudyCards with resolved values', () => {
    const deck_ids = [4, 5]
    const study_all = true

    useMultiDeckStudyCardsQuery(deck_ids, study_all)

    const { query } = mockUseQuery.mock.calls[0][0]
    query()
    expect(mockFetchMultiDeckStudyCards).toHaveBeenCalledWith(deck_ids, study_all)
  })

  test('defaults study_all to false when not provided [obligation]', () => {
    useMultiDeckStudyCardsQuery([1])

    const { key } = mockUseQuery.mock.calls[0][0]
    expect(key()[3]).toBe(false)
  })

  test('returns the useQuery result directly', () => {
    const mock_result = { data: ref([]), refetch: vi.fn(), status: 'success' }
    mockUseQuery.mockReturnValueOnce(mock_result)

    const result = useMultiDeckStudyCardsQuery([1])
    expect(result).toBe(mock_result)
  })
})
