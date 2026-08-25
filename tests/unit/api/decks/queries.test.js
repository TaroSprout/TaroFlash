import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { ref } from 'vue'

const {
  useQuerySpy,
  fetchMemberDecksMock,
  fetchDeckMock,
  fetchMemberDeckCountMock,
  getQueryDataMock
} = vi.hoisted(() => ({
  useQuerySpy: vi.fn((cfg) => cfg),
  fetchMemberDecksMock: vi.fn(),
  fetchDeckMock: vi.fn(),
  fetchMemberDeckCountMock: vi.fn(),
  getQueryDataMock: vi.fn()
}))

vi.mock('@pinia/colada', () => ({
  useQuery: useQuerySpy,
  useQueryCache: () => ({ getQueryData: getQueryDataMock })
}))

vi.mock('@/api/decks/db', () => ({
  fetchMemberDecks: fetchMemberDecksMock,
  fetchDeck: fetchDeckMock,
  fetchMemberDeckCount: fetchMemberDeckCountMock
}))

import { useMemberDecksQuery } from '@/api/decks/queries/list'
import { useDeckQuery } from '@/api/decks/queries/by-id'
import { useMemberDeckCountQuery } from '@/api/decks/queries/count'

beforeEach(() => {
  useQuerySpy.mockClear()
  getQueryDataMock.mockReset()
  getQueryDataMock.mockReturnValue(undefined)
})

function configFrom(hook) {
  hook()
  return useQuerySpy.mock.calls.at(-1)[0]
}

describe('useMemberDecksQuery', () => {
  test('uses the static ["decks"] key — mutations invalidate by this exact prefix', () => {
    const { key } = configFrom(useMemberDecksQuery)
    expect(key).toEqual(['decks'])
  })

  test('fetches fresh decks and returns them unchanged when no cached row carries a client_key [obligation]', async () => {
    fetchMemberDecksMock.mockResolvedValueOnce([{ id: 1, title: 'a' }])
    getQueryDataMock.mockReturnValue([{ id: 1, title: 'a' }])
    const { query } = configFrom(useMemberDecksQuery)

    const result = await query()

    expect(result).toEqual([{ id: 1, title: 'a' }])
  })

  test('short-circuits to the fresh rows untouched when the cache holds no client_key at all [obligation]', async () => {
    const fresh = [{ id: 1, title: 'a' }]
    fetchMemberDecksMock.mockResolvedValueOnce(fresh)
    getQueryDataMock.mockReturnValue(undefined)
    const { query } = configFrom(useMemberDecksQuery)

    const result = await query()

    expect(result).toBe(fresh)
  })

  test('carries a cached client_key forward onto the freshly-fetched row with the matching id [obligation]', async () => {
    fetchMemberDecksMock.mockResolvedValueOnce([
      { id: 5, title: 'confirmed' },
      { id: 6, title: 'untouched' }
    ])
    getQueryDataMock.mockReturnValue([{ id: 5, title: 'pending-cached', client_key: 'key-1' }])
    const { query } = configFrom(useMemberDecksQuery)

    const result = await query()

    expect(result).toEqual([
      { id: 5, title: 'confirmed', client_key: 'key-1' },
      { id: 6, title: 'untouched' }
    ])
  })

  test('rows with no prior client_key pass through untouched [obligation]', async () => {
    fetchMemberDecksMock.mockResolvedValueOnce([{ id: 7, title: 'plain' }])
    getQueryDataMock.mockReturnValue([
      { id: 5, title: 'x', client_key: 'key-1' },
      { id: 7, title: 'plain-cached' }
    ])
    const { query } = configFrom(useMemberDecksQuery)

    const result = await query()

    expect(result).toEqual([{ id: 7, title: 'plain' }])
  })
})

describe('useDeckQuery', () => {
  test('uses ["deck", id] — distinct from the list key, so list mutations do not invalidate detail', () => {
    const { key } = configFrom(() => useDeckQuery(7))
    expect(key()).toEqual(['deck', 7])
  })

  test('key is reactive — recomputes when the id source changes', () => {
    let id = 7
    const { key } = configFrom(() => useDeckQuery(() => id))
    expect(key()).toEqual(['deck', 7])
    id = 8
    expect(key()).toEqual(['deck', 8])
  })

  test('query fetches the deck at the current id', async () => {
    fetchDeckMock.mockResolvedValueOnce({ id: 7, title: 'x' })
    const { query } = configFrom(() => useDeckQuery(7))
    const result = await query()
    expect(fetchDeckMock).toHaveBeenCalledWith(7)
    expect(result).toEqual({ id: 7, title: 'x' })
  })
})

describe('useMemberDeckCountQuery', () => {
  test('uses ["decks", "count"] — sits under the decks prefix so deck mutations invalidate it', () => {
    const { key } = configFrom(useMemberDeckCountQuery)
    expect(key).toEqual(['decks', 'count'])
  })

  test('delegates to fetchMemberDeckCount', () => {
    const { query } = configFrom(useMemberDeckCountQuery)
    expect(query).toBe(fetchMemberDeckCountMock)
  })

  // [obligation] useCan() instantiates this query and is mounted per card face
  // editor, so the default 5s staleTime made every newly rendered card row
  // refetch the member deck count. Explicit ['decks'] invalidation on deck
  // create/delete/move carries the freshness; this is only the backstop.
  test('staleTime is 5 minutes, well past a card row mount [obligation]', () => {
    const { staleTime } = configFrom(useMemberDeckCountQuery)
    expect(staleTime).toBe(1000 * 60 * 5)
  })

  // [obligation] useCan() and subscription-actions.ts call this with no
  // argument at all — they must keep auto-fetching exactly as before this
  // param was added.
  describe('enabled param', () => {
    test('defaults to enabled when no argument is passed [obligation]', () => {
      const { enabled } = configFrom(useMemberDeckCountQuery)
      expect(enabled()).toBe(true)
    })

    test('a literal false disables the query [obligation]', () => {
      const { enabled } = configFrom(() => useMemberDeckCountQuery(false))
      expect(enabled()).toBe(false)
    })

    test('accepts a ref and re-reads its current value on each call [obligation]', () => {
      const live = ref(false)
      const { enabled } = configFrom(() => useMemberDeckCountQuery(live))

      expect(enabled()).toBe(false)
      live.value = true
      expect(enabled()).toBe(true)
    })

    test('accepts a getter function and re-reads it on each call [obligation]', () => {
      let live = false
      const { enabled } = configFrom(() => useMemberDeckCountQuery(() => live))

      expect(enabled()).toBe(false)
      live = true
      expect(enabled()).toBe(true)
    })
  })
})
