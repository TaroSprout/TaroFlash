import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
//
// The single checkpoint is registered via `router.beforeEach(async (to) => {...})`
// at module scope in src/router/index.ts — there's no per-route `beforeEnter` to
// grab anymore. We spy on `createRouter` (keeping the real implementation) so we
// can capture the exact guard function the module registers, then invoke it
// directly with `to` objects built from the real router's own `resolve()` — this
// exercises the real route table's meta (including parent→child meta merge)
// without triggering navigation, dynamic chunk loads, or component mounting.

const {
  mockSessionStore,
  mockMemberStore,
  mockUseCan,
  mockPrefetchMemberById,
  mockPrefetchMemberDecks,
  mockIsPasswordRecoveryUrl
} = vi.hoisted(() => ({
  mockSessionStore: { ensureResolved: vi.fn() },
  mockMemberStore: {},
  mockUseCan: vi.fn(),
  mockPrefetchMemberById: vi.fn(),
  mockPrefetchMemberDecks: vi.fn(),
  mockIsPasswordRecoveryUrl: vi.fn()
}))

vi.mock('@/stores/session', () => ({
  useSessionStore: () => mockSessionStore
}))

vi.mock('@/stores/member', () => ({
  useMemberStore: () => mockMemberStore
}))

vi.mock('@/composables/can', () => ({
  useCan: mockUseCan
}))

vi.mock('@/api/session', () => ({
  isPasswordRecoveryUrl: mockIsPasswordRecoveryUrl
}))

vi.mock('@/api/members', () => ({
  prefetchMemberById: mockPrefetchMemberById
}))

// The checkpoint no longer imports @/api/decks at all — mocked here only so a
// regression (someone re-adding the prefetch call) would surface as a call.
vi.mock('@/api/decks', () => ({
  prefetchMemberDecks: mockPrefetchMemberDecks
}))

// Not under test here; avoids pulling in the real view (and its own composable
// tree) just to resolve the route table.
vi.mock('@/views/app-shell/authenticated.vue', () => ({ default: {} }))

const guardHolder = vi.hoisted(() => ({ current: undefined }))

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    createRouter: (options) => {
      const instance = actual.createRouter(options)
      const originalBeforeEach = instance.beforeEach.bind(instance)
      instance.beforeEach = (guard) => {
        guardHolder.current = guard
        return originalBeforeEach(guard)
      }
      return instance
    }
  }
})

import router from '@/router/index'

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveTo(path) {
  return router.resolve(path)
}

function capturedGuard(to) {
  return guardHolder.current(to)
}

beforeEach(() => {
  mockSessionStore.ensureResolved.mockReset().mockResolvedValue(true)
  mockMemberStore.pending_deletion = false
  mockUseCan.mockReset().mockReturnValue({ useAudioReader: { value: true } })
  mockPrefetchMemberById.mockReset().mockResolvedValue(undefined)
  mockPrefetchMemberDecks.mockReset()
  mockIsPasswordRecoveryUrl.mockReset().mockReturnValue(false)
})

describe('router — the single auth checkpoint', () => {
  test('registers exactly one beforeEach guard', () => {
    expect(typeof guardHolder.current).toBe('function')
  })

  // ── requiresAuth ────────────────────────────────────────────────────────────

  describe('requiresAuth', () => {
    test('a signed-out visitor hitting a shell URL is redirected to welcome carrying the original path as next', async () => {
      mockSessionStore.ensureResolved.mockResolvedValue(false)
      const to = resolveTo('/deck/123')

      const result = await capturedGuard(to)

      expect(result).toEqual({ name: 'welcome', query: { next: '/deck/123' } })
    })

    test('a signed-in visitor is allowed through to a shell URL', async () => {
      mockSessionStore.ensureResolved.mockResolvedValue(true)
      const to = resolveTo('/dashboard')

      const result = await capturedGuard(to)

      expect(result).toBeUndefined()
    })

    test('a pending-deletion member is NOT diverted — auth passes and the shell route is allowed through', async () => {
      mockSessionStore.ensureResolved.mockResolvedValue(true)
      mockMemberStore.pending_deletion = true
      const to = resolveTo('/dashboard')

      const result = await capturedGuard(to)

      expect(result).toBeUndefined()
    })
  })

  // ── guestOnly ──────────────────────────────────────────────────────────────

  describe('guestOnly', () => {
    test('a signed-in visitor navigating to /welcome is redirected to dashboard', async () => {
      mockSessionStore.ensureResolved.mockResolvedValue(true)
      mockIsPasswordRecoveryUrl.mockReturnValue(false)
      const to = resolveTo('/welcome')

      const result = await capturedGuard(to)

      expect(result).toEqual({ name: 'dashboard' })
    })

    test('a signed-out visitor stays on /welcome (no redirect)', async () => {
      mockSessionStore.ensureResolved.mockResolvedValue(false)
      const to = resolveTo('/welcome')

      const result = await capturedGuard(to)

      expect(result).toBeUndefined()
    })

    test('is skipped on a password-recovery link, so an authenticated visitor still lands on /welcome', async () => {
      mockSessionStore.ensureResolved.mockResolvedValue(true)
      mockIsPasswordRecoveryUrl.mockReturnValue(true)
      const to = resolveTo('/welcome')

      const result = await capturedGuard(to)

      expect(result).toBeUndefined()
    })
  })

  // ── no policy: /privacy, /terms ────────────────────────────────────────────

  describe('routes with no policy meta', () => {
    test('/privacy allows a signed-in visitor through untouched', async () => {
      mockSessionStore.ensureResolved.mockResolvedValue(true)
      const to = resolveTo('/privacy')

      const result = await capturedGuard(to)

      expect(result).toBeUndefined()
    })

    test('/terms allows a signed-in visitor through untouched', async () => {
      mockSessionStore.ensureResolved.mockResolvedValue(true)
      const to = resolveTo('/terms')

      const result = await capturedGuard(to)

      expect(result).toBeUndefined()
    })
  })

  // ── capability ─────────────────────────────────────────────────────────────

  describe('capability', () => {
    test('a non-admin (useCan().useAudioReader false) opening the lesson route is redirected to dashboard', async () => {
      mockSessionStore.ensureResolved.mockResolvedValue(true)
      mockUseCan.mockReturnValue({ useAudioReader: { value: false } })
      const to = resolveTo('/audio-reader/collection/1/lesson/2')

      const result = await capturedGuard(to)

      expect(result).toEqual({ name: 'dashboard' })
    })

    test('an admin (useCan().useAudioReader true) is allowed through to the lesson route', async () => {
      mockSessionStore.ensureResolved.mockResolvedValue(true)
      mockUseCan.mockReturnValue({ useAudioReader: { value: true } })
      const to = resolveTo('/audio-reader/collection/1/lesson/2')

      const result = await capturedGuard(to)

      expect(result).toBeUndefined()
    })

    test('reads the admin rule from useCan(), not a hand-copied member.role check', async () => {
      mockSessionStore.ensureResolved.mockResolvedValue(true)
      mockMemberStore.role = 'admin' // if the guard ever reads this directly, it would wrongly pass
      mockUseCan.mockReturnValue({ useAudioReader: { value: false } })
      const to = resolveTo('/audio-reader/collection/1/lesson/2')

      const result = await capturedGuard(to)

      expect(mockUseCan).toHaveBeenCalled()
      expect(result).toEqual({ name: 'dashboard' })
    })

    test('resolves the member row before reading the capability, awaiting prefetchMemberById', async () => {
      mockSessionStore.ensureResolved.mockResolvedValue(true)
      let resolvePrefetch
      mockPrefetchMemberById.mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePrefetch = resolve
        })
      )
      mockUseCan.mockReturnValue({ useAudioReader: { value: true } })
      const to = resolveTo('/audio-reader/collection/1/lesson/2')

      const resultPromise = capturedGuard(to)
      await Promise.resolve()
      expect(mockUseCan).not.toHaveBeenCalled()

      resolvePrefetch()
      const result = await resultPromise

      expect(mockUseCan).toHaveBeenCalled()
      expect(result).toBeUndefined()
    })
  })

  // ── policy order: auth → guestOnly → capability, first failure wins ───────

  describe('policy order', () => {
    test('a signed-out visitor to the lesson route fails on auth and never reaches the capability check', async () => {
      mockSessionStore.ensureResolved.mockResolvedValue(false)
      const to = resolveTo('/audio-reader/collection/1/lesson/2')

      const result = await capturedGuard(to)

      expect(result).toEqual({
        name: 'welcome',
        query: { next: '/audio-reader/collection/1/lesson/2' }
      })
      expect(mockUseCan).not.toHaveBeenCalled()
      expect(mockPrefetchMemberById).not.toHaveBeenCalled()
    })
  })

  // ── prefetchMemberDecks dropped ─────────────────────────────────────────────

  test('never calls prefetchMemberDecks — the old prefetch is dropped', async () => {
    mockSessionStore.ensureResolved.mockResolvedValue(true)
    mockUseCan.mockReturnValue({ useAudioReader: { value: true } })

    await capturedGuard(resolveTo('/dashboard'))
    await capturedGuard(resolveTo('/deck/123'))
    await capturedGuard(resolveTo('/audio-reader/collection/1/lesson/2'))
    await capturedGuard(resolveTo('/welcome'))

    expect(mockPrefetchMemberDecks).not.toHaveBeenCalled()
  })
})
