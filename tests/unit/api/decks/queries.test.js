import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { useQuerySpy, fetchMemberDecksMock, fetchDeckMock, fetchMemberDeckCountMock } = vi.hoisted(
  () => ({
    useQuerySpy: vi.fn((cfg) => cfg),
    fetchMemberDecksMock: vi.fn(),
    fetchDeckMock: vi.fn(),
    fetchMemberDeckCountMock: vi.fn()
  })
)

vi.mock('@pinia/colada', () => ({ useQuery: useQuerySpy }))

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

  test('delegates to fetchMemberDecks', () => {
    const { query } = configFrom(useMemberDecksQuery)
    expect(query).toBe(fetchMemberDecksMock)
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
  // editor, so a default 5s staleTime made every newly rendered card row
  // refetch the member deck count. Freshness comes solely from explicit
  // ['decks'] invalidation on deck create/delete/move.
  test('staleTime is Infinity — freshness comes only from explicit ["decks"] invalidation [obligation]', () => {
    const { staleTime } = configFrom(useMemberDeckCountQuery)
    expect(staleTime).toBe(Infinity)
  })
})
