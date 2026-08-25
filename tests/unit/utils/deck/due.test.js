import { describe, test, expect } from 'vite-plus/test'
import { totalDueCardCount } from '@/utils/deck/due'

describe('totalDueCardCount', () => {
  test('returns 0 for an empty array', () => {
    expect(totalDueCardCount([])).toBe(0)
  })

  test('treats a missing due_count as 0 rather than NaN', () => {
    expect(totalDueCardCount([{ id: 1 }])).toBe(0)
  })

  test('treats a null due_count as 0 rather than NaN', () => {
    expect(totalDueCardCount([{ id: 1, due_count: null }])).toBe(0)
  })

  test('sums due_count across a mixed list', () => {
    const decks = [{ id: 1, due_count: 3 }, { id: 2 }, { id: 3, due_count: 5 }]
    expect(totalDueCardCount(decks)).toBe(8)
  })
})
