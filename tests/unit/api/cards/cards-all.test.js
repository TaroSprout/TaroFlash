import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { fetchCardsInDeckMock } = vi.hoisted(() => ({
  fetchCardsInDeckMock: vi.fn()
}))

vi.mock('@/api/cards/db/get-cards-in-deck', () => ({
  fetchCardsInDeck: fetchCardsInDeckMock
}))

import { fetchAllCardsInDeck } from '@/api/cards/db/cards-all'

function row(id) {
  return { id, rank: `rank-${id}` }
}

beforeEach(() => {
  fetchCardsInDeckMock.mockReset()
})

describe('fetchAllCardsInDeck', () => {
  test('loops across pages, accumulating cards in the order the pages came back', async () => {
    fetchCardsInDeckMock
      .mockResolvedValueOnce({ cards: [row(1), row(2)], next_rank: 'rank-3' })
      .mockResolvedValueOnce({ cards: [row(3)], next_rank: null })

    const cards = await fetchAllCardsInDeck(7)

    expect(cards).toEqual([row(1), row(2), row(3)])
    expect(fetchCardsInDeckMock).toHaveBeenCalledTimes(2)
  })

  test('stops once a page comes back with next_rank: null', async () => {
    fetchCardsInDeckMock.mockResolvedValueOnce({ cards: [row(1)], next_rank: null })

    await fetchAllCardsInDeck(7)

    expect(fetchCardsInDeckMock).toHaveBeenCalledOnce()
  })

  test('advances offset by the accumulated card count on each page', async () => {
    fetchCardsInDeckMock
      .mockResolvedValueOnce({ cards: [row(1), row(2)], next_rank: 'rank-3' })
      .mockResolvedValueOnce({ cards: [row(3)], next_rank: null })

    await fetchAllCardsInDeck(7)

    expect(fetchCardsInDeckMock.mock.calls[0][0]).toMatchObject({ deck_id: 7, offset: 0 })
    expect(fetchCardsInDeckMock.mock.calls[1][0]).toMatchObject({ deck_id: 7, offset: 2 })
  })

  test('returns an empty array when the deck has no cards', async () => {
    fetchCardsInDeckMock.mockResolvedValueOnce({ cards: [], next_rank: null })
    const cards = await fetchAllCardsInDeck(7)
    expect(cards).toEqual([])
  })
})
