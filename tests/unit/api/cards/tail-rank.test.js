import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { fromMock, selectMock, eqMock, orderMock, limitMock, maybeSingleMock } = vi.hoisted(() => {
  const maybeSingleMock = vi.fn()
  const limitMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }))
  const orderMock = vi.fn(() => ({ limit: limitMock }))
  const eqMock = vi.fn(() => ({ order: orderMock }))
  const selectMock = vi.fn(() => ({ eq: eqMock }))
  const fromMock = vi.fn(() => ({ select: selectMock }))
  return { fromMock, selectMock, eqMock, orderMock, limitMock, maybeSingleMock }
})

vi.mock('@/supabase-client', () => ({
  supabase: { from: fromMock }
}))

vi.mock('@/utils/logger', () => ({ default: { error: vi.fn() } }))

import { fetchDeckTailRank } from '@/api/cards/db/tail-rank'

describe('fetchDeckTailRank', () => {
  beforeEach(() => {
    fromMock.mockClear()
    selectMock.mockClear()
    eqMock.mockClear()
    orderMock.mockClear()
    limitMock.mockClear()
    maybeSingleMock.mockReset()
  })

  test('queries the highest rank in the deck', async () => {
    maybeSingleMock.mockResolvedValueOnce({ data: { rank: 'a5' }, error: null })

    await fetchDeckTailRank(10)

    expect(fromMock).toHaveBeenCalledWith('cards')
    expect(selectMock).toHaveBeenCalledWith('rank')
    expect(eqMock).toHaveBeenCalledWith('deck_id', 10)
    expect(orderMock).toHaveBeenCalledWith('rank', { ascending: false })
    expect(limitMock).toHaveBeenCalledWith(1)
  })

  test('returns the highest rank', async () => {
    maybeSingleMock.mockResolvedValueOnce({ data: { rank: 'z9' }, error: null })
    const rank = await fetchDeckTailRank(10)
    expect(rank).toBe('z9')
  })

  test('returns null for an empty deck [obligation]', async () => {
    maybeSingleMock.mockResolvedValueOnce({ data: null, error: null })
    const rank = await fetchDeckTailRank(10)
    expect(rank).toBeNull()
  })

  test('throws when the query errors', async () => {
    const err = new Error('not authorized')
    maybeSingleMock.mockResolvedValueOnce({ data: null, error: err })
    await expect(fetchDeckTailRank(10)).rejects.toBe(err)
  })
})
