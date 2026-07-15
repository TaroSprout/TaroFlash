import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { useQuerySpy, fetchFeedbackItemsMock } = vi.hoisted(() => ({
  useQuerySpy: vi.fn((cfg) => cfg),
  fetchFeedbackItemsMock: vi.fn()
}))

vi.mock('@pinia/colada', () => ({ useQuery: useQuerySpy }))

vi.mock('@/api/feedback/db', () => ({
  fetchFeedbackItems: fetchFeedbackItemsMock
}))

import { useFeedbackItemsQuery } from '@/api/feedback/queries/list'

beforeEach(() => {
  useQuerySpy.mockClear()
})

function config() {
  useFeedbackItemsQuery()
  return useQuerySpy.mock.calls.at(-1)[0]
}

describe('useFeedbackItemsQuery', () => {
  test('uses the ["feedback-items"] key — mutations invalidate by this exact prefix', () => {
    const { key } = config()
    expect(key).toEqual(['feedback-items'])
  })

  test('delegates to fetchFeedbackItems', () => {
    const { query } = config()
    expect(query).toBe(fetchFeedbackItemsMock)
  })
})
