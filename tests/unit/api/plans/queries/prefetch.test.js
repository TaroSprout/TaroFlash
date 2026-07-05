import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { ensureSpy, fetchSpy, fetchPlanLimitsMock } = vi.hoisted(() => ({
  ensureSpy: vi.fn(),
  fetchSpy: vi.fn(),
  fetchPlanLimitsMock: vi.fn()
}))

vi.mock('@pinia/colada', () => ({
  useQueryCache: () => ({
    ensure: ensureSpy,
    fetch: fetchSpy
  })
}))

vi.mock('@/api/plans/db', () => ({
  fetchPlanLimits: fetchPlanLimitsMock
}))

import { prefetchPlanLimits } from '@/api/plans/queries/prefetch'

beforeEach(() => {
  ensureSpy.mockReset()
  fetchSpy.mockReset()
  fetchPlanLimitsMock.mockReset()
})

describe('prefetchPlanLimits', () => {
  test('registers the shared ["plans"] key so a later usePlanLimitsQuery hits the warmed entry', () => {
    const entry = { id: 'entry' }
    ensureSpy.mockReturnValue(entry)
    fetchSpy.mockResolvedValue([])

    prefetchPlanLimits()

    const [opts] = ensureSpy.mock.calls[0]
    expect(opts.key).toEqual(['plans'])
    expect(opts.query).toBe(fetchPlanLimitsMock)
  })

  test('passes the entry returned by ensure straight into fetch so the promise binds to the same cache slot', () => {
    const entry = { id: 'entry' }
    ensureSpy.mockReturnValue(entry)
    fetchSpy.mockResolvedValue([])

    prefetchPlanLimits()

    expect(fetchSpy).toHaveBeenCalledWith(entry)
  })

  test('returns the fetch promise so callers can await the prefetch if they choose to', async () => {
    const data = [{ id: 'free', deck_limit: 10, cards_per_deck_limit: 500 }]
    ensureSpy.mockReturnValue({})
    fetchSpy.mockResolvedValue(data)

    await expect(prefetchPlanLimits()).resolves.toBe(data)
  })
})
