import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { ref } from 'vue'

const { fetchAllCardsInDeckMock, useQueryMock } = vi.hoisted(() => ({
  fetchAllCardsInDeckMock: vi.fn(),
  useQueryMock: vi.fn()
}))

vi.mock('@/api/cards/db', () => ({
  fetchAllCardsInDeck: fetchAllCardsInDeckMock
}))

vi.mock('@pinia/colada', () => ({
  useQuery: useQueryMock
}))

import { useAllCardsInDeckQuery } from '@/api/cards/queries/cards-all'

beforeEach(() => {
  fetchAllCardsInDeckMock.mockReset()
  useQueryMock.mockReset()
  useQueryMock.mockReturnValue({})
})

describe('useAllCardsInDeckQuery', () => {
  test('is disabled — exporting fetches on demand rather than staying live', () => {
    useAllCardsInDeckQuery(ref(5))
    const [{ enabled }] = useQueryMock.mock.calls[0]
    expect(enabled()).toBe(false)
  })

  test('key scopes by deck_id and an "all" marker distinct from the paged query', () => {
    useAllCardsInDeckQuery(ref(5))
    const [{ key }] = useQueryMock.mock.calls[0]
    expect(key()).toEqual(['cards', 5, 'all'])
  })

  test('key falls back to deck_id 0 when deck_id is undefined', () => {
    useAllCardsInDeckQuery(ref(undefined))
    const [{ key }] = useQueryMock.mock.calls[0]
    expect(key()).toEqual(['cards', 0, 'all'])
  })

  test('query fn delegates to fetchAllCardsInDeck with the resolved deck_id', () => {
    useAllCardsInDeckQuery(ref(9))
    const [{ query }] = useQueryMock.mock.calls[0]
    query()
    expect(fetchAllCardsInDeckMock).toHaveBeenCalledWith(9)
  })
})
