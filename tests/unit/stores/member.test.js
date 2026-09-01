import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { setActivePinia, createPinia } from 'pinia'

const { memberRef, sessionUser, sessionAuthenticated } = vi.hoisted(() => ({
  memberRef: { value: null },
  sessionUser: { value: null },
  sessionAuthenticated: { value: false }
}))

vi.mock('@/api/members', async () => {
  const { ref } = await vi.importActual('vue')
  const errorRef = ref(null)
  const statusRef = ref('pending')
  return {
    useCurrentMemberQuery: () => ({ data: memberRef, error: errorRef, status: statusRef }),
    __mockMemberError: errorRef,
    __mockMemberStatus: statusRef
  }
})

vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({
    get user() {
      return sessionUser.value
    },
    get authenticated() {
      return sessionAuthenticated.value
    }
  })
}))

import { useMemberStore } from '@/stores/member'
import {
  __mockMemberError as memberErrorRef,
  __mockMemberStatus as memberStatusRef
} from '@/api/members'

describe('useMemberStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    memberRef.value = null
    sessionUser.value = null
    sessionAuthenticated.value = false
    memberErrorRef.value = null
    memberStatusRef.value = 'pending'
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

  // ── email sourced from session, not the stale profile row ────

  test('email comes from the session, not the (potentially stale) member query row', () => {
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

  // ── preferences always resolved ───────────────────────────────

  test('preferences resolves to full defaults when the member query has no data yet', () => {
    sessionUser.value = { id: 'user-1' }
    memberRef.value = null

    const store = useMemberStore()

    expect(store.preferences).toEqual({
      accessibility: { left_hand: false },
      audio: {
        muted: expect.any(Boolean),
        interface_sounds: expect.any(Number),
        hover_sounds: expect.any(Number)
      },
      study: {
        show_all_ratings: false,
        show_rating_buttons: true,
        show_button_preview: false,
        show_card_preview: true,
        multi_deck_ordering: 'random'
      }
    })
  })

  test('preferences resolves to full defaults when member.preferences is null', () => {
    sessionUser.value = { id: 'user-1' }
    memberRef.value = { id: 'user-1', preferences: null }

    const store = useMemberStore()

    expect(store.preferences.study).toEqual({
      show_all_ratings: false,
      show_rating_buttons: true,
      show_button_preview: false,
      show_card_preview: true,
      multi_deck_ordering: 'random'
    })
  })

  test('preferences merges a partial payload with defaults, never dropping a field', () => {
    sessionUser.value = { id: 'user-1' }
    memberRef.value = { id: 'user-1', preferences: { study: { show_all_ratings: false } } }

    const store = useMemberStore()

    expect(store.preferences.study).toEqual({
      show_all_ratings: false,
      show_rating_buttons: true,
      show_button_preview: false,
      show_card_preview: true,
      multi_deck_ordering: 'random'
    })
    expect(store.preferences.accessibility).toEqual({ left_hand: false })
  })

  // ── deck_limit / cards_per_deck_limit — null-safe against the plans embed

  describe('deck_limit / cards_per_deck_limit', () => {
    test('reads limits from the embedded plans object when present', () => {
      sessionUser.value = { id: 'user-1' }
      memberRef.value = { id: 'user-1', plans: { deck_limit: 5, cards_per_deck_limit: 200 } }

      const store = useMemberStore()

      expect(store.deck_limit).toBe(5)
      expect(store.cards_per_deck_limit).toBe(200)
    })

    test('falls back to null when plans is null (e.g. inactive plan row)', () => {
      sessionUser.value = { id: 'user-1' }
      memberRef.value = { id: 'user-1', plans: null }

      const store = useMemberStore()

      expect(store.deck_limit).toBeNull()
      expect(store.cards_per_deck_limit).toBeNull()
    })

    test('falls back to null when plans is undefined (e.g. member query has no data yet)', () => {
      sessionUser.value = { id: 'user-1' }
      memberRef.value = null

      const store = useMemberStore()

      expect(store.deck_limit).toBeNull()
      expect(store.cards_per_deck_limit).toBeNull()
    })
  })

  // ── profile_missing — deleted account with a still-valid JWT ───────────────

  describe('profile_missing', () => {
    test('is false while the profile query is still pending', () => {
      sessionAuthenticated.value = true
      sessionUser.value = { id: 'user-1' }
      memberStatusRef.value = 'pending'
      memberRef.value = null

      const store = useMemberStore()

      expect(store.profile_missing).toBe(false)
    })

    test('is true once the query settles successfully with no row', () => {
      sessionAuthenticated.value = true
      sessionUser.value = { id: 'user-1' }
      memberStatusRef.value = 'success'
      memberRef.value = null

      const store = useMemberStore()

      expect(store.profile_missing).toBe(true)
    })

    test('is false when the settled query returned a member row', () => {
      sessionAuthenticated.value = true
      sessionUser.value = { id: 'user-1' }
      memberStatusRef.value = 'success'
      memberRef.value = { id: 'user-1' }

      const store = useMemberStore()

      expect(store.profile_missing).toBe(false)
    })

    test('is false when the query errored — that is a load failure, not a deletion', () => {
      sessionAuthenticated.value = true
      sessionUser.value = { id: 'user-1' }
      memberStatusRef.value = 'error'
      memberRef.value = null
      memberErrorRef.value = new Error('fetch failed')

      const store = useMemberStore()

      expect(store.profile_missing).toBe(false)
    })

    test('is false when logged out, even with a settled empty query', () => {
      sessionAuthenticated.value = false
      memberStatusRef.value = 'success'
      memberRef.value = null

      const store = useMemberStore()

      expect(store.profile_missing).toBe(false)
    })
  })

  // ── pending_deletion / delete_at ──────────────────────────────

  describe('pending_deletion / delete_at', () => {
    test('pending_deletion is false and delete_at is null when the member has no delete_at', () => {
      sessionUser.value = { id: 'user-1' }
      memberRef.value = { id: 'user-1', delete_at: null }

      const store = useMemberStore()

      expect(store.pending_deletion).toBe(false)
      expect(store.delete_at).toBeNull()
    })

    test('pending_deletion is true and delete_at reflects the deadline once the account is archived', () => {
      sessionUser.value = { id: 'user-1' }
      memberRef.value = { id: 'user-1', delete_at: '2026-08-05T00:00:00Z' }

      const store = useMemberStore()

      expect(store.pending_deletion).toBe(true)
      expect(store.delete_at).toBe('2026-08-05T00:00:00Z')
    })

    test('pending_deletion is false and delete_at is null when the member query has no data yet', () => {
      sessionUser.value = { id: 'user-1' }
      memberRef.value = null

      const store = useMemberStore()

      expect(store.pending_deletion).toBe(false)
      expect(store.delete_at).toBeNull()
    })
  })

  // ── error — passthrough from the query ────────────────────────

  describe('error', () => {
    test('is undefined/null when the query has no error', () => {
      sessionUser.value = { id: 'user-1' }
      const store = useMemberStore()
      expect(store.error).toBeFalsy()
    })

    test('passes the query error straight through', () => {
      sessionUser.value = { id: 'user-1' }
      const err = new Error('fetch failed')
      memberErrorRef.value = err

      const store = useMemberStore()

      expect(store.error).toBe(err)
    })
  })
})
