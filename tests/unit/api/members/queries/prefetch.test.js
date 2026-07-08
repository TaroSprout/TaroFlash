import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { ensureSpy, refreshSpy, fetchMemberByIdMock } = vi.hoisted(() => ({
  ensureSpy: vi.fn(),
  refreshSpy: vi.fn(),
  fetchMemberByIdMock: vi.fn()
}))

vi.mock('@pinia/colada', () => ({
  useQueryCache: () => ({
    ensure: ensureSpy,
    refresh: refreshSpy
  })
}))

vi.mock('@/api/members/db', () => ({
  fetchMemberById: fetchMemberByIdMock
}))

import { prefetchMemberById } from '@/api/members/queries/prefetch'

beforeEach(() => {
  ensureSpy.mockReset()
  refreshSpy.mockReset()
  fetchMemberByIdMock.mockReset()
})

describe('prefetchMemberById', () => {
  test('scopes the cache key by id so the entry matches useCurrentMemberQuery for the same user', () => {
    ensureSpy.mockReturnValue({})
    refreshSpy.mockResolvedValue({})

    prefetchMemberById('user-1')

    const [opts] = ensureSpy.mock.calls[0]
    expect(opts.key).toEqual(['member', 'user-1'])
  })

  test('query closure forwards the id to fetchMemberById at call time', async () => {
    ensureSpy.mockReturnValue({})
    refreshSpy.mockResolvedValue({})
    fetchMemberByIdMock.mockResolvedValue({ id: 'user-1' })

    prefetchMemberById('user-1')

    const [opts] = ensureSpy.mock.calls[0]
    await opts.query()
    expect(fetchMemberByIdMock).toHaveBeenCalledWith('user-1')
  })

  test('calls refresh (not fetch) against the ensured entry so an in-flight request from the member store query is reused [obligation]', () => {
    const entry = { id: 'entry' }
    ensureSpy.mockReturnValue(entry)
    refreshSpy.mockResolvedValue({})

    prefetchMemberById('user-1')

    expect(refreshSpy).toHaveBeenCalledWith(entry)
  })

  test('returns the refresh promise so callers can await it when needed', async () => {
    const data = { id: 'user-1', display_name: 'A' }
    ensureSpy.mockReturnValue({})
    refreshSpy.mockResolvedValue(data)

    await expect(prefetchMemberById('user-1')).resolves.toBe(data)
  })
})
