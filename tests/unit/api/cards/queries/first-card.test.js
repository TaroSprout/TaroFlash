import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { useQuerySpy, fetchCardsPageByDeckIdMock } = vi.hoisted(() => ({
  useQuerySpy: vi.fn((cfg) => cfg),
  fetchCardsPageByDeckIdMock: vi.fn()
}))

vi.mock('@pinia/colada', () => ({
  useQuery: useQuerySpy
}))

vi.mock('@/api/cards/db', () => ({
  fetchCardsPageByDeckId: fetchCardsPageByDeckIdMock
}))

import { useFirstCardInDeckQuery } from '@/api/cards/queries/first-card'

beforeEach(() => {
  useQuerySpy.mockClear()
  fetchCardsPageByDeckIdMock.mockClear()
})

function configFrom(deck_id) {
  useFirstCardInDeckQuery(deck_id)
  return useQuerySpy.mock.calls.at(-1)[0]
}

describe('useFirstCardInDeckQuery', () => {
  test('key is ["cards", deck_id, "first"] — sits under the cards prefix so card mutations invalidate it', () => {
    const { key } = configFrom(() => 7)
    expect(key()).toEqual(['cards', 7, 'first'])
  })

  test('key falls back to 0 when deck_id is undefined', () => {
    const { key } = configFrom(() => undefined)
    expect(key()).toEqual(['cards', 0, 'first'])
  })

  test('enabled is false when deck_id is undefined', () => {
    const { enabled } = configFrom(() => undefined)
    expect(enabled()).toBe(false)
  })

  test('enabled is false when deck_id is falsy (0)', () => {
    const { enabled } = configFrom(() => 0)
    expect(enabled()).toBe(false)
  })

  test('enabled is true when deck_id is a positive number', () => {
    const { enabled } = configFrom(() => 3)
    expect(enabled()).toBe(true)
  })

  test('accepts a plain (non-getter) value for deck_id', () => {
    const { key, enabled } = configFrom(5)
    expect(key()).toEqual(['cards', 5, 'first'])
    expect(enabled()).toBe(true)
  })

  test('query delegates to fetchCardsPageByDeckId with deck_id, offset 0, limit 1', async () => {
    fetchCardsPageByDeckIdMock.mockResolvedValueOnce([{ id: 1 }])
    const { query } = configFrom(() => 9)
    await query()
    expect(fetchCardsPageByDeckIdMock).toHaveBeenCalledWith({ deck_id: 9, offset: 0, limit: 1 })
  })
})
