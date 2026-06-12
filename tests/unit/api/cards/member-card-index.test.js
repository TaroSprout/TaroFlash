import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { useQuerySpy, fetchMemberCardIndexMock } = vi.hoisted(() => ({
  useQuerySpy: vi.fn((cfg) => cfg),
  fetchMemberCardIndexMock: vi.fn()
}))

vi.mock('@pinia/colada', () => ({
  useQuery: useQuerySpy
}))

vi.mock('@/api/cards/db', () => ({
  fetchMemberCardIndex: fetchMemberCardIndexMock
}))

import { useMemberCardIndexQuery } from '@/api/cards/queries/member-card-index'

beforeEach(() => {
  useQuerySpy.mockClear()
  fetchMemberCardIndexMock.mockClear()
})

function configFrom() {
  useMemberCardIndexQuery()
  return useQuerySpy.mock.calls.at(-1)[0]
}

describe('useMemberCardIndexQuery [obligation]', () => {
  test('is keyed exactly ["cards", "index"] [obligation]', () => {
    const { key } = configFrom()
    expect(key()).toEqual(['cards', 'index'])
  })

  test('query calls fetchMemberCardIndex', async () => {
    fetchMemberCardIndexMock.mockResolvedValueOnce([])
    const { query } = configFrom()
    await query()
    expect(fetchMemberCardIndexMock).toHaveBeenCalledTimes(1)
  })

  test('query returns the result from fetchMemberCardIndex', async () => {
    const index = [{ term: 'cat', deck_ids: [1] }]
    fetchMemberCardIndexMock.mockResolvedValueOnce(index)
    const { query } = configFrom()
    const result = await query()
    expect(result).toEqual(index)
  })
})
