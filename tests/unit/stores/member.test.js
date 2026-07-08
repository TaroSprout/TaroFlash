import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { setActivePinia, createPinia } from 'pinia'

const { memberRef, sessionUser } = vi.hoisted(() => ({
  memberRef: { value: null },
  sessionUser: { value: null }
}))

vi.mock('@/api/members', async () => {
  const { ref } = await vi.importActual('vue')
  const errorRef = ref(null)
  return {
    useCurrentMemberQuery: () => ({ data: memberRef, error: errorRef }),
    __mockMemberError: errorRef
  }
})

vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({
    get user() {
      return sessionUser.value
    }
  })
}))

import { useMemberStore } from '@/stores/member'
import { __mockMemberError as memberErrorRef } from '@/api/members'

describe('useMemberStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    memberRef.value = null
    sessionUser.value = null
    memberErrorRef.value = null
  })

  test('all fields are undefined and has_member is false when nothing is loaded', () => {
    const store = useMemberStore()
    expect(store.id).toBeUndefined()
    expect(store.display_name).toBeUndefined()
    expect(store.email).toBeUndefined()
    expect(store.role).toBeUndefined()
    expect(store.plan).toBeUndefined()
    expect(store.has_member).toBe(false)
  })

  test('id comes from the session and has_member flips once session.user is set', () => {
    const store = useMemberStore()
    sessionUser.value = { id: 'abc' }
    expect(store.id).toBe('abc')
    expect(store.has_member).toBe(true)
  })

  test('profile fields come from the member query, id stays session-sourced', () => {
    sessionUser.value = { id: 'user-1', email: 'current@test.com' }
    memberRef.value = {
      id: 'user-1',
      display_name: 'Alice',
      description: 'hi',
      email: 'a@test.com',
      created_at: '2026-01-01',
      avatar_url: 'https://avatar',
      role: 'admin',
      plan: 'paid'
    }

    const store = useMemberStore()

    expect(store.id).toBe('user-1')
    expect(store.display_name).toBe('Alice')
    expect(store.description).toBe('hi')
    expect(store.email).toBe('current@test.com')
    expect(store.created_at).toBe('2026-01-01')
    expect(store.avatar_url).toBe('https://avatar')
    expect(store.role).toBe('admin')
    expect(store.plan).toBe('paid')
    expect(store.has_member).toBe(true)
  })

  // ── email sourced from session, not the stale profile row [obligation] ────

  test('email comes from the session, not the (potentially stale) member query row [obligation]', () => {
    sessionUser.value = { id: 'user-1', email: 'fresh@test.com' }
    memberRef.value = { id: 'user-1', email: 'stale@test.com' }

    const store = useMemberStore()

    expect(store.email).toBe('fresh@test.com')
  })

  test('profile fields stay undefined when the query resolves to null', () => {
    sessionUser.value = { id: 'user-1' }
    memberRef.value = null

    const store = useMemberStore()

    expect(store.id).toBe('user-1')
    expect(store.role).toBeUndefined()
    expect(store.plan).toBeUndefined()
    expect(store.has_member).toBe(true)
  })

  // ── preferences always resolved [obligation] ───────────────────────────────

  test('preferences resolves to full defaults when the member query has no data yet [obligation]', () => {
    sessionUser.value = { id: 'user-1' }
    memberRef.value = null

    const store = useMemberStore()

    expect(store.preferences).toEqual({
      accessibility: { left_hand: false },
      audio: {
        study_sounds: expect.any(Number),
        interface_sounds: expect.any(Number),
        hover_sounds: expect.any(Number)
      },
      study: {
        show_all_ratings: true,
        desired_retention: 90,
        learning_steps: ['1m', '10m'],
        relearning_steps: ['10m']
      }
    })
  })

  test('preferences resolves to full defaults when member.preferences is null [obligation]', () => {
    sessionUser.value = { id: 'user-1' }
    memberRef.value = { id: 'user-1', preferences: null }

    const store = useMemberStore()

    expect(store.preferences.study).toEqual({
      show_all_ratings: true,
      desired_retention: 90,
      learning_steps: ['1m', '10m'],
      relearning_steps: ['10m']
    })
  })

  test('preferences merges a partial payload with defaults, never dropping a field [obligation]', () => {
    sessionUser.value = { id: 'user-1' }
    memberRef.value = { id: 'user-1', preferences: { study: { show_all_ratings: false } } }

    const store = useMemberStore()

    expect(store.preferences.study).toEqual({
      show_all_ratings: false,
      desired_retention: 90,
      learning_steps: ['1m', '10m'],
      relearning_steps: ['10m']
    })
    expect(store.preferences.accessibility).toEqual({ left_hand: false })
  })

  // ── deck_limit / cards_per_deck_limit — null-safe against the plans embed [obligation]

  describe('deck_limit / cards_per_deck_limit [obligation]', () => {
    test('reads limits from the embedded plans object when present [obligation]', () => {
      sessionUser.value = { id: 'user-1' }
      memberRef.value = { id: 'user-1', plans: { deck_limit: 5, cards_per_deck_limit: 200 } }

      const store = useMemberStore()

      expect(store.deck_limit).toBe(5)
      expect(store.cards_per_deck_limit).toBe(200)
    })

    test('falls back to null when plans is null (e.g. inactive plan row) [obligation]', () => {
      sessionUser.value = { id: 'user-1' }
      memberRef.value = { id: 'user-1', plans: null }

      const store = useMemberStore()

      expect(store.deck_limit).toBeNull()
      expect(store.cards_per_deck_limit).toBeNull()
    })

    test('falls back to null when plans is undefined (e.g. member query has no data yet) [obligation]', () => {
      sessionUser.value = { id: 'user-1' }
      memberRef.value = null

      const store = useMemberStore()

      expect(store.deck_limit).toBeNull()
      expect(store.cards_per_deck_limit).toBeNull()
    })
  })

  // ── error — passthrough from the query [obligation] ────────────────────────

  describe('error [obligation]', () => {
    test('is undefined/null when the query has no error', () => {
      sessionUser.value = { id: 'user-1' }
      const store = useMemberStore()
      expect(store.error).toBeFalsy()
    })

    test('passes the query error straight through [obligation]', () => {
      sessionUser.value = { id: 'user-1' }
      const err = new Error('fetch failed')
      memberErrorRef.value = err

      const store = useMemberStore()

      expect(store.error).toBe(err)
    })
  })
})
