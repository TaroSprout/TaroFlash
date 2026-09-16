import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { useQuerySpy, fetchSessionEarningsMock } = vi.hoisted(() => ({
  useQuerySpy: vi.fn((cfg) => cfg),
  fetchSessionEarningsMock: vi.fn()
}))

vi.mock('@pinia/colada', () => ({
  useQuery: useQuerySpy
}))

vi.mock('@/api/rewards/db', () => ({
  fetchSessionEarnings: fetchSessionEarningsMock
}))

import { useSessionEarningsQuery } from '@/api/rewards/queries/session-earnings'

beforeEach(() => {
  useQuerySpy.mockClear()
  fetchSessionEarningsMock.mockClear()
})

describe('useSessionEarningsQuery', () => {
  test('keys off the given session id', () => {
    const config = useSessionEarningsQuery(() => 'session-1')
    expect(config.key()).toEqual(['session-earnings', 'session-1'])
  })

  test('keys with an empty string when the session id is undefined', () => {
    const config = useSessionEarningsQuery(() => undefined)
    expect(config.key()).toEqual(['session-earnings', ''])
  })

  test('is disabled while the session id is undefined', () => {
    const config = useSessionEarningsQuery(() => undefined)
    expect(config.enabled()).toBe(false)
  })

  test('is enabled once a session id is given', () => {
    const config = useSessionEarningsQuery(() => 'session-1')
    expect(config.enabled()).toBe(true)
  })

  test('query() calls fetchSessionEarnings with the resolved session id', () => {
    const config = useSessionEarningsQuery(() => 'session-1')
    config.query()
    expect(fetchSessionEarningsMock).toHaveBeenCalledWith('session-1')
  })

  test('accepts a plain string as well as a getter', () => {
    const config = useSessionEarningsQuery('session-2')
    expect(config.key()).toEqual(['session-earnings', 'session-2'])
  })
})
