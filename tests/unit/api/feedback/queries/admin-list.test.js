import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { useQuerySpy, fetchAllFeedbackItemsMock } = vi.hoisted(() => ({
  useQuerySpy: vi.fn((cfg) => cfg),
  fetchAllFeedbackItemsMock: vi.fn()
}))

vi.mock('@pinia/colada', () => ({ useQuery: useQuerySpy }))

vi.mock('@/api/feedback/db', () => ({
  fetchAllFeedbackItems: fetchAllFeedbackItemsMock
}))

import { useAdminFeedbackItemsQuery } from '@/api/feedback/queries/admin-list'

beforeEach(() => {
  useQuerySpy.mockClear()
})

function config() {
  useAdminFeedbackItemsQuery()
  return useQuerySpy.mock.calls.at(-1)[0]
}

describe('useAdminFeedbackItemsQuery', () => {
  test('uses the ["feedback-items", "admin"] key [obligation]', () => {
    const { key } = config()
    expect(key).toEqual(['feedback-items', 'admin'])
  })

  test("key is prefixed by useUpdateFeedbackItemMutation's invalidateQueries({ key: ['feedback-items'] }) so a write refetches this list [obligation]", () => {
    const { key } = config()
    const invalidated_prefix = ['feedback-items']
    expect(key.slice(0, invalidated_prefix.length)).toEqual(invalidated_prefix)
  })

  test('delegates to fetchAllFeedbackItems, not fetchFeedbackItems — admin sees unpublished items too [obligation]', () => {
    const { query } = config()
    expect(query).toBe(fetchAllFeedbackItemsMock)
  })
})
