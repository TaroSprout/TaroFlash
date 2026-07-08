import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { ensureSpy, refreshSpy, fetchMemberDecksMock } = vi.hoisted(() => ({
  ensureSpy: vi.fn(),
  refreshSpy: vi.fn(),
  fetchMemberDecksMock: vi.fn()
}))

vi.mock('@pinia/colada', () => ({
  useQueryCache: () => ({
    ensure: ensureSpy,
    refresh: refreshSpy
  })
}))

vi.mock('@/api/decks/db', () => ({
  fetchMemberDecks: fetchMemberDecksMock
}))

import { prefetchMemberDecks } from '@/api/decks/queries/prefetch'

beforeEach(() => {
  ensureSpy.mockReset()
  refreshSpy.mockReset()
  fetchMemberDecksMock.mockReset()
})

describe('prefetchMemberDecks', () => {
  test('registers the shared ["decks"] key so a later useMemberDecksQuery hits the warmed entry', () => {
    const entry = { id: 'entry' }
    ensureSpy.mockReturnValue(entry)
    refreshSpy.mockResolvedValue({})

    prefetchMemberDecks()

    const [opts] = ensureSpy.mock.calls[0]
    expect(opts.key).toEqual(['decks'])
    expect(opts.query).toBe(fetchMemberDecksMock)
  })

  test('passes the entry returned by ensure straight into refresh so an in-flight request is reused instead of restarted [obligation]', () => {
    const entry = { id: 'entry' }
    ensureSpy.mockReturnValue(entry)
    refreshSpy.mockResolvedValue({})

    prefetchMemberDecks()

    expect(refreshSpy).toHaveBeenCalledWith(entry)
  })

  test('returns the refresh promise so callers can await the prefetch if they choose to', async () => {
    const data = [{ id: 1 }]
    ensureSpy.mockReturnValue({})
    refreshSpy.mockResolvedValue(data)

    await expect(prefetchMemberDecks()).resolves.toBe(data)
  })
})
