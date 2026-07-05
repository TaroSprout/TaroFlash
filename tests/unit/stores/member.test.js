import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { setActivePinia, createPinia } from 'pinia'

const { memberRef, sessionUser } = vi.hoisted(() => ({
  memberRef: { value: null },
  sessionUser: { value: null }
}))

vi.mock('@/api/members', () => ({
  useCurrentMemberQuery: () => ({ data: memberRef })
}))

vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({
    get user() {
      return sessionUser.value
    }
  })
}))

import { useMemberStore } from '@/stores/member'

describe('useMemberStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    memberRef.value = null
    sessionUser.value = null
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
    sessionUser.value = { id: 'user-1' }
    memberRef.value = {
      id: 'user-1',
      display_name: 'Alice',
      description: 'hi',
      email: 'a@test.com',
      created_at: '2026-01-01',
      avatar_url: 'https://avatar',
      updated_at: '2026-01-02',
      role: 'admin',
      plan: 'paid'
    }

    const store = useMemberStore()

    expect(store.id).toBe('user-1')
    expect(store.display_name).toBe('Alice')
    expect(store.description).toBe('hi')
    expect(store.email).toBe('a@test.com')
    expect(store.created_at).toBe('2026-01-01')
    expect(store.avatar_url).toBe('https://avatar')
    expect(store.updated_at).toBe('2026-01-02')
    expect(store.role).toBe('admin')
    expect(store.plan).toBe('paid')
    expect(store.has_member).toBe(true)
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
})
