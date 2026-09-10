import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { useQuerySpy, fetchCapabilitySwitchesMock } = vi.hoisted(() => ({
  useQuerySpy: vi.fn((cfg) => cfg),
  fetchCapabilitySwitchesMock: vi.fn()
}))

let sessionUserId

vi.mock('@pinia/colada', () => ({
  useQuery: useQuerySpy
}))

vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({ user: sessionUserId ? { id: sessionUserId } : null })
}))

vi.mock('@/api/capabilities/db', () => ({
  fetchCapabilitySwitches: fetchCapabilitySwitchesMock
}))

import {
  capabilitySwitchesQuery,
  useCapabilitySwitchesQuery
} from '@/api/capabilities/queries/switches'

beforeEach(() => {
  useQuerySpy.mockClear()
  sessionUserId = undefined
})

describe('capabilitySwitchesQuery', () => {
  test('keys off the session user id', () => {
    sessionUserId = 'member-123'
    const config = capabilitySwitchesQuery()
    expect(config.key).toEqual(['capability-switches', 'member-123'])
  })

  test('keys with an empty string when no session user is set', () => {
    sessionUserId = undefined
    const config = capabilitySwitchesQuery()
    expect(config.key).toEqual(['capability-switches', ''])
  })

  test('is disabled until the session user id resolves', () => {
    sessionUserId = undefined
    expect(capabilitySwitchesQuery().enabled).toBe(false)
  })

  test('is enabled once the session user id resolves', () => {
    sessionUserId = 'member-123'
    expect(capabilitySwitchesQuery().enabled).toBe(true)
  })

  test('uses fetchCapabilitySwitches as the query function', () => {
    const config = capabilitySwitchesQuery()
    expect(config.query).toBe(fetchCapabilitySwitchesMock)
  })
})

describe('useCapabilitySwitchesQuery', () => {
  test('passes capabilitySwitchesQuery to useQuery', () => {
    useCapabilitySwitchesQuery()
    expect(useQuerySpy).toHaveBeenCalledWith(capabilitySwitchesQuery)
  })
})
