import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { useQuerySpy, fetchCapabilitiesMock } = vi.hoisted(() => ({
  useQuerySpy: vi.fn((cfg) => cfg),
  fetchCapabilitiesMock: vi.fn()
}))

let sessionUserId

vi.mock('@pinia/colada', () => ({
  useQuery: useQuerySpy
}))

vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({ user: sessionUserId ? { id: sessionUserId } : null })
}))

vi.mock('@/api/capabilities/db', () => ({
  fetchCapabilities: fetchCapabilitiesMock
}))

import { capabilitiesQuery, useCapabilitiesQuery } from '@/api/capabilities/queries/capabilities'

beforeEach(() => {
  useQuerySpy.mockClear()
  sessionUserId = undefined
})

describe('capabilitiesQuery', () => {
  test('keys off the session user id', () => {
    sessionUserId = 'member-123'
    const config = capabilitiesQuery()
    expect(config.key).toEqual(['capabilities', 'member-123'])
  })

  test('keys with an empty string when no session user is set', () => {
    sessionUserId = undefined
    const config = capabilitiesQuery()
    expect(config.key).toEqual(['capabilities', ''])
  })

  test('is disabled until the session user id resolves', () => {
    sessionUserId = undefined
    expect(capabilitiesQuery().enabled).toBe(false)
  })

  test('is enabled once the session user id resolves', () => {
    sessionUserId = 'member-123'
    expect(capabilitiesQuery().enabled).toBe(true)
  })

  test('uses fetchCapabilities as the query function', () => {
    const config = capabilitiesQuery()
    expect(config.query).toBe(fetchCapabilitiesMock)
  })
})

describe('useCapabilitiesQuery', () => {
  test('passes capabilitiesQuery to useQuery', () => {
    useCapabilitiesQuery()
    expect(useQuerySpy).toHaveBeenCalledWith(capabilitiesQuery)
  })
})
