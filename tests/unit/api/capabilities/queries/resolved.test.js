import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { useQuerySpy, fetchResolvedCapabilitiesMock } = vi.hoisted(() => ({
  useQuerySpy: vi.fn((cfg) => cfg),
  fetchResolvedCapabilitiesMock: vi.fn()
}))

let sessionUserId

vi.mock('@pinia/colada', () => ({
  useQuery: useQuerySpy
}))

vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({ user: sessionUserId ? { id: sessionUserId } : null })
}))

vi.mock('@/api/capabilities/db', () => ({
  fetchResolvedCapabilities: fetchResolvedCapabilitiesMock
}))

import {
  resolvedCapabilitiesQuery,
  useResolvedCapabilitiesQuery
} from '@/api/capabilities/queries/resolved'

beforeEach(() => {
  useQuerySpy.mockClear()
  sessionUserId = undefined
})

describe('resolvedCapabilitiesQuery', () => {
  test('keys off the session user id', () => {
    sessionUserId = 'member-123'
    const config = resolvedCapabilitiesQuery()
    expect(config.key).toEqual(['capabilities', 'resolved', 'member-123'])
  })

  test('keys with an empty string when no session user is set', () => {
    sessionUserId = undefined
    const config = resolvedCapabilitiesQuery()
    expect(config.key).toEqual(['capabilities', 'resolved', ''])
  })

  test('is disabled until the session user id resolves', () => {
    sessionUserId = undefined
    expect(resolvedCapabilitiesQuery().enabled).toBe(false)
  })

  test('is enabled once the session user id resolves', () => {
    sessionUserId = 'member-123'
    expect(resolvedCapabilitiesQuery().enabled).toBe(true)
  })

  test('uses fetchResolvedCapabilities as the query function', () => {
    const config = resolvedCapabilitiesQuery()
    expect(config.query).toBe(fetchResolvedCapabilitiesMock)
  })
})

describe('useResolvedCapabilitiesQuery', () => {
  test('passes resolvedCapabilitiesQuery to useQuery', () => {
    useResolvedCapabilitiesQuery()
    expect(useQuerySpy).toHaveBeenCalledWith(resolvedCapabilitiesQuery)
  })
})
