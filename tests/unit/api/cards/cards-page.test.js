import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { fromMock, rangeMock, orderMock, eqMock, selectMock } = vi.hoisted(() => {
  const rangeMock = vi.fn()
  // order() returns { order, range } so two sequential .order() calls chain correctly
  const orderMock = vi.fn(() => ({ order: orderMock, range: rangeMock }))
  const eqMock = vi.fn(() => ({ order: orderMock }))
  const selectMock = vi.fn(() => ({ eq: eqMock }))
  const fromMock = vi.fn(() => ({ select: selectMock }))
  return { fromMock, rangeMock, orderMock, eqMock, selectMock }
})

vi.mock('@/supabase-client', () => ({
  supabase: { from: fromMock }
}))

vi.mock('@/utils/logger', () => ({ default: { error: vi.fn() } }))

import { fetchCardsPageByDeckId } from '@/api/cards/db/cards-page'

beforeEach(() => {
  fromMock.mockClear()
  selectMock.mockClear()
  eqMock.mockClear()
  orderMock.mockClear()
  rangeMock.mockReset()
})

describe('fetchCardsPageByDeckId', () => {
  test('queries cards_with_images joined with reviews, scoped to the deck, ordered by rank', async () => {
    rangeMock.mockResolvedValueOnce({ data: [], error: null })
    await fetchCardsPageByDeckId({ deck_id: 10, offset: 0, limit: 50 })
    expect(fromMock).toHaveBeenCalledWith('cards_with_images')
    expect(selectMock).toHaveBeenCalledWith('*, review:reviews(*)')
    expect(eqMock).toHaveBeenCalledWith('deck_id', 10)
    expect(orderMock).toHaveBeenCalledWith('rank', { ascending: true })
  })

  // [obligation] both .order() calls in sequence — rank primary, id tiebreak
  test('applies id as secondary sort key after rank so duplicate ranks paginate deterministically', async () => {
    rangeMock.mockResolvedValueOnce({ data: [], error: null })
    await fetchCardsPageByDeckId({ deck_id: 10, offset: 0, limit: 50 })
    const calls = orderMock.mock.calls
    expect(calls[0]).toEqual(['rank', { ascending: true }])
    expect(calls[1]).toEqual(['id', { ascending: true }])
  })

  test('translates offset+limit into a Postgrest inclusive range', async () => {
    rangeMock.mockResolvedValueOnce({ data: [], error: null })
    await fetchCardsPageByDeckId({ deck_id: 10, offset: 100, limit: 50 })
    expect(rangeMock).toHaveBeenCalledWith(100, 149)
  })

  test('returns rows from the response', async () => {
    rangeMock.mockResolvedValueOnce({ data: [{ id: 1 }, { id: 2 }], error: null })
    const result = await fetchCardsPageByDeckId({ deck_id: 10, offset: 0, limit: 50 })
    expect(result).toEqual([{ id: 1 }, { id: 2 }])
  })

  test('throws when the request errors', async () => {
    rangeMock.mockResolvedValueOnce({ data: null, error: { message: 'boom' } })
    await expect(fetchCardsPageByDeckId({ deck_id: 10, offset: 0, limit: 50 })).rejects.toThrow(
      'boom'
    )
  })
})
