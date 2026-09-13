import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { ref } from 'vue'

const { useQuerySpy, searchMembersMock } = vi.hoisted(() => ({
  useQuerySpy: vi.fn((cfg) => cfg),
  searchMembersMock: vi.fn()
}))

vi.mock('@pinia/colada', () => ({
  useQuery: useQuerySpy
}))

vi.mock('@/api/members/db', () => ({
  searchMembers: searchMembersMock
}))

import { useMemberSearchQuery } from '@/api/members/queries/search'

beforeEach(() => {
  useQuerySpy.mockClear()
  searchMembersMock.mockReset()
})

function configFrom(term) {
  useMemberSearchQuery(term)
  return useQuerySpy.mock.calls.at(-1)[0]
}

describe('useMemberSearchQuery', () => {
  test('is disabled when the trimmed term is below 2 characters', () => {
    const { enabled } = configFrom(ref('a'))
    expect(enabled()).toBe(false)
  })

  test('is disabled when the term is only whitespace after trimming', () => {
    const { enabled } = configFrom(ref('  a '))
    expect(enabled()).toBe(false)
  })

  test('is enabled once the trimmed term reaches 2 characters', () => {
    const { enabled } = configFrom(ref('al'))
    expect(enabled()).toBe(true)
  })

  test('key includes the trimmed term', () => {
    const { key } = configFrom(ref('  alice  '))
    expect(key()).toEqual(['member-search', 'alice'])
  })

  test('query calls searchMembers with the untrimmed term', async () => {
    searchMembersMock.mockResolvedValue([])
    const { query } = configFrom(ref('  alice  '))
    await query()
    expect(searchMembersMock).toHaveBeenCalledWith('  alice  ')
  })
})
