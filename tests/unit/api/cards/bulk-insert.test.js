import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { insertMock, selectMock, fromMock, tailRankMock, ranksBetweenMock } = vi.hoisted(() => {
  const selectMock = vi.fn()
  const insertMock = vi.fn(() => ({ select: selectMock }))
  const fromMock = vi.fn(() => ({ insert: insertMock }))
  return {
    insertMock,
    selectMock,
    fromMock,
    tailRankMock: vi.fn(),
    ranksBetweenMock: vi.fn()
  }
})

vi.mock('@/supabase-client', () => ({
  supabase: { from: fromMock }
}))

vi.mock('@/utils/logger', () => ({ default: { error: vi.fn() } }))

vi.mock('@/utils/card/rank', () => ({ ranksBetween: ranksBetweenMock }))

vi.mock('@/api/cards/db/tail-rank', () => ({ fetchDeckTailRank: tailRankMock }))

import { bulkInsertCardsInDeck } from '@/api/cards/db/bulk-insert'

describe('bulkInsertCardsInDeck', () => {
  beforeEach(() => {
    fromMock.mockClear()
    insertMock.mockClear()
    selectMock.mockReset()
    tailRankMock.mockReset()
    ranksBetweenMock.mockReset()
  })

  test('plain multi-row insert against the cards table, no RPC', async () => {
    tailRankMock.mockResolvedValueOnce(null)
    ranksBetweenMock.mockReturnValueOnce(['a0', 'a1'])
    selectMock.mockResolvedValueOnce({ data: [], error: null })

    const cards = [
      { front_text: 'A', back_text: '1' },
      { front_text: 'B', back_text: '2' }
    ]
    await bulkInsertCardsInDeck({ deck_id: 10, cards })

    expect(fromMock).toHaveBeenCalledWith('cards')
    expect(insertMock).toHaveBeenCalledWith([
      { front_text: 'A', back_text: '1', deck_id: 10, rank: 'a0' },
      { front_text: 'B', back_text: '2', deck_id: 10, rank: 'a1' }
    ])
  })

  test('mints one key per card, after the deck tail', async () => {
    tailRankMock.mockResolvedValueOnce('a0')
    ranksBetweenMock.mockReturnValueOnce(['a1', 'a2', 'a3'])
    selectMock.mockResolvedValueOnce({ data: [], error: null })

    const cards = [
      { front_text: 'A', back_text: '' },
      { front_text: 'B', back_text: '' },
      { front_text: 'C', back_text: '' }
    ]
    await bulkInsertCardsInDeck({ deck_id: 10, cards })

    expect(tailRankMock).toHaveBeenCalledWith(10)
    expect(ranksBetweenMock).toHaveBeenCalledWith({ prev: 'a0', next: null }, 3)
  })

  test('returns the inserted rows from the response', async () => {
    tailRankMock.mockResolvedValueOnce(null)
    ranksBetweenMock.mockReturnValueOnce([])
    const inserted = [
      { id: 1, deck_id: 10, front_text: 'A', back_text: '1', rank: 'a0' },
      { id: 2, deck_id: 10, front_text: 'B', back_text: '2', rank: 'a1' }
    ]
    selectMock.mockResolvedValueOnce({ data: inserted, error: null })
    const result = await bulkInsertCardsInDeck({ deck_id: 10, cards: [] })
    expect(result).toEqual(inserted)
  })

  test('throws when the insert errors', async () => {
    tailRankMock.mockResolvedValueOnce(null)
    ranksBetweenMock.mockReturnValueOnce([])
    const err = new Error('not authorized')
    selectMock.mockResolvedValueOnce({ data: null, error: err })
    await expect(bulkInsertCardsInDeck({ deck_id: 10, cards: [] })).rejects.toBe(err)
  })
})
