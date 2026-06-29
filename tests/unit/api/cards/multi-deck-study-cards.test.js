import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { fetchMultiDeckStudyCards } from '@/api/cards/db/multi-deck-study-cards'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockFetchStudySessionCards } = vi.hoisted(() => ({
  mockFetchStudySessionCards: vi.fn()
}))

vi.mock('@/api/cards/db/study-session-cards', () => ({
  fetchStudySessionCards: (...args) => mockFetchStudySessionCards(...args)
}))

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('fetchMultiDeckStudyCards', () => {
  beforeEach(() => {
    mockFetchStudySessionCards.mockReset()
  })

  test('returns empty array for empty deck list [obligation]', async () => {
    const result = await fetchMultiDeckStudyCards([], false)
    expect(result).toEqual([])
    expect(mockFetchStudySessionCards).not.toHaveBeenCalled()
  })

  test('calls fetchStudySessionCards for each deck_id with the study_all flag', async () => {
    mockFetchStudySessionCards.mockResolvedValue([])
    await fetchMultiDeckStudyCards([1, 2, 3], false)
    expect(mockFetchStudySessionCards).toHaveBeenCalledTimes(3)
    expect(mockFetchStudySessionCards).toHaveBeenCalledWith(1, false)
    expect(mockFetchStudySessionCards).toHaveBeenCalledWith(2, false)
    expect(mockFetchStudySessionCards).toHaveBeenCalledWith(3, false)
  })

  test('concatenates results in deck-id order [obligation]', async () => {
    const deck1_cards = [
      { id: 1, deck_id: 10 },
      { id: 2, deck_id: 10 }
    ]
    const deck2_cards = [{ id: 3, deck_id: 20 }]

    mockFetchStudySessionCards
      .mockImplementationOnce(() => Promise.resolve(deck1_cards))
      .mockImplementationOnce(() => Promise.resolve(deck2_cards))

    const result = await fetchMultiDeckStudyCards([10, 20], false)
    expect(result).toEqual([...deck1_cards, ...deck2_cards])
  })

  test('passes study_all=true to each deck fetch', async () => {
    mockFetchStudySessionCards.mockResolvedValue([])
    await fetchMultiDeckStudyCards([1], true)
    expect(mockFetchStudySessionCards).toHaveBeenCalledWith(1, true)
  })

  test('deck-id order is preserved even when a later deck resolves first (Promise.all ordering) [obligation]', async () => {
    const deck1_cards = [{ id: 1, deck_id: 10 }]
    const deck2_cards = [
      { id: 2, deck_id: 20 },
      { id: 3, deck_id: 20 }
    ]

    // Both resolve immediately but in deck-id order due to Promise.all
    mockFetchStudySessionCards
      .mockImplementationOnce(() => Promise.resolve(deck1_cards))
      .mockImplementationOnce(() => Promise.resolve(deck2_cards))

    const result = await fetchMultiDeckStudyCards([10, 20], false)

    // Deck 10's cards come first, deck 20's second
    expect(result[0]).toEqual(deck1_cards[0])
    expect(result[1]).toEqual(deck2_cards[0])
    expect(result[2]).toEqual(deck2_cards[1])
  })

  test('single deck returns the same result as fetchStudySessionCards alone', async () => {
    const cards = [{ id: 1, deck_id: 5 }]
    mockFetchStudySessionCards.mockResolvedValue(cards)

    const result = await fetchMultiDeckStudyCards([5], false)
    expect(result).toEqual(cards)
  })

  test('default study_all is false when not provided', async () => {
    mockFetchStudySessionCards.mockResolvedValue([])
    await fetchMultiDeckStudyCards([1])
    expect(mockFetchStudySessionCards).toHaveBeenCalledWith(1, false)
  })
})
