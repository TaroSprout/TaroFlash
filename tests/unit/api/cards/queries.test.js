import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

// useSearchCardsInDeckQuery (search-in-deck.ts) and the original
// useCardsInDeckInfiniteQuery tests were removed in the fsrs-card-filter
// branch: search-in-deck.ts was deleted and the infinite-query tests migrated
// to tests/unit/api/cards/queries/cards-page.test.js which covers the new
// sort_by / search_query API. This file retains only the useMemberCardCountQuery
// tests that have no other home.

const { useQuerySpy, fetchMemberCardCountMock } = vi.hoisted(() => ({
  useQuerySpy: vi.fn((cfg) => cfg),
  fetchMemberCardCountMock: vi.fn()
}))

vi.mock('@pinia/colada', () => ({
  useQuery: useQuerySpy
}))

vi.mock('@/api/cards/db', () => ({
  fetchMemberCardCount: fetchMemberCardCountMock
}))

import { useMemberCardCountQuery } from '@/api/cards/queries/member-card-count'

beforeEach(() => {
  useQuerySpy.mockClear()
})

function configFrom(hook) {
  hook()
  return useQuerySpy.mock.calls.at(-1)[0]
}

describe('useMemberCardCountQuery', () => {
  test('uses ["cards", "count", opts] — sits under the cards prefix so card mutations invalidate it', () => {
    const { key } = configFrom(() => useMemberCardCountQuery({ only_due_cards: true }))
    expect(key()).toEqual(['cards', 'count', { only_due_cards: true }])
  })

  test('defaults to an empty opts object when no opts are provided', () => {
    const { key } = configFrom(useMemberCardCountQuery)
    expect(key()).toEqual(['cards', 'count', {}])
  })

  test('query passes opts through to fetchMemberCardCount', async () => {
    fetchMemberCardCountMock.mockResolvedValueOnce(3)
    const { query } = configFrom(() => useMemberCardCountQuery({ only_due_cards: true }))
    await query()
    expect(fetchMemberCardCountMock).toHaveBeenCalledWith({ only_due_cards: true })
  })
})
