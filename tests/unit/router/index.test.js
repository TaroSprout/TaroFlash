import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  mockSessionStore,
  mockMemberStore,
  mockPrefetchMemberDecks,
  mockPrefetchMemberById,
  mockOpenPendingDeletionNotice
} = vi.hoisted(() => ({
  mockSessionStore: { user: { id: 'user-1' }, restoreSession: vi.fn() },
  mockMemberStore: { role: 'member', pending_deletion: false },
  mockPrefetchMemberDecks: vi.fn(),
  mockPrefetchMemberById: vi.fn(),
  mockOpenPendingDeletionNotice: vi.fn()
}))

vi.mock('@/stores/session', () => ({
  useSessionStore: () => mockSessionStore
}))

vi.mock('@/stores/member', () => ({
  useMemberStore: () => mockMemberStore
}))

vi.mock('@/api/decks', () => ({
  prefetchMemberDecks: mockPrefetchMemberDecks
}))

vi.mock('@/api/members', () => ({
  prefetchMemberById: mockPrefetchMemberById
}))

vi.mock('@/composables/member/pending-deletion-notice', () => ({
  usePendingDeletionNotice: () => ({ open: mockOpenPendingDeletionNotice })
}))

vi.mock('@/views/app-shell/authenticated.vue', () => ({ default: {} }))

import router from '@/router/index'

// ── Helpers ───────────────────────────────────────────────────────────────────

function findRoute(name) {
  return router.getRoutes().find((r) => r.name === name)
}

beforeEach(() => {
  mockSessionStore.user = { id: 'user-1' }
  mockSessionStore.restoreSession.mockReset().mockResolvedValue(true)
  mockMemberStore.role = 'member'
  mockMemberStore.pending_deletion = false
  mockPrefetchMemberDecks.mockReset()
  mockPrefetchMemberById.mockReset().mockResolvedValue(undefined)
  mockOpenPendingDeletionNotice.mockReset()
})

describe('router — authenticated route beforeEnter', () => {
  test('redirects to welcome when restoreSession resolves false', async () => {
    mockSessionStore.restoreSession.mockResolvedValueOnce(false)
    const authenticated =
      findRoute('authenticated') ?? router.getRoutes().find((r) => r.path === '/')
    const result = await authenticated.beforeEnter()
    expect(result).toEqual({ name: 'welcome' })
  })

  // [obligation] resolveMember() must AWAIT the member prefetch before this
  // guard reads pending_deletion off the store — otherwise a direct URL hit
  // reads an unset flag mid-restore and waves a pending account through.
  test('awaits prefetchMemberById before reading member.pending_deletion [obligation]', async () => {
    let resolvePrefetch
    mockPrefetchMemberById.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePrefetch = resolve
      })
    )
    mockMemberStore.pending_deletion = true
    const authenticated = router.getRoutes().find((r) => r.path === '/')

    const resultPromise = authenticated.beforeEnter()
    await Promise.resolve()
    expect(mockOpenPendingDeletionNotice).not.toHaveBeenCalled()

    resolvePrefetch()
    await resultPromise

    expect(mockOpenPendingDeletionNotice).toHaveBeenCalledOnce()
  })

  test('calls prefetchMemberById with the session user id [obligation]', async () => {
    const authenticated = router.getRoutes().find((r) => r.path === '/')
    await authenticated.beforeEnter()
    expect(mockPrefetchMemberById).toHaveBeenCalledWith('user-1')
  })

  test('fires prefetchMemberDecks when authenticated and not pending [obligation]', async () => {
    const authenticated = router.getRoutes().find((r) => r.path === '/')
    await authenticated.beforeEnter()
    expect(mockPrefetchMemberDecks).toHaveBeenCalledOnce()
  })

  // ── pending-deletion divert [obligation] ───────────────────────────────────

  describe('when the member is pending deletion [obligation]', () => {
    test('opens the pending-deletion notice and redirects to welcome [obligation]', async () => {
      mockMemberStore.pending_deletion = true
      const authenticated = router.getRoutes().find((r) => r.path === '/')

      const result = await authenticated.beforeEnter()

      expect(mockOpenPendingDeletionNotice).toHaveBeenCalledOnce()
      expect(result).toEqual({ name: 'welcome' })
    })

    test('does NOT call prefetchMemberDecks — RLS returns zero rows for a pending member [obligation]', async () => {
      mockMemberStore.pending_deletion = true
      const authenticated = router.getRoutes().find((r) => r.path === '/')

      await authenticated.beforeEnter()

      expect(mockPrefetchMemberDecks).not.toHaveBeenCalled()
    })
  })
})

describe('router — requireAudioReader (lesson route beforeEnter)', () => {
  function lessonBeforeEnter() {
    const lesson = router.getRoutes().find((r) => r.name === 'lesson')
    return lesson.beforeEnter
  }

  test('calls prefetchMemberById (via cache.refresh under the hood) when a user id exists [obligation]', async () => {
    await lessonBeforeEnter()()
    expect(mockPrefetchMemberById).toHaveBeenCalledWith('user-1')
  })

  test('does not throw when prefetchMemberById rejects', async () => {
    mockPrefetchMemberById.mockRejectedValueOnce(new Error('network error'))
    await expect(lessonBeforeEnter()()).resolves.not.toThrow()
  })

  // [obligation] requireAudioReader must AWAIT resolveMember() (which awaits
  // the prefetch) before reading role — otherwise a direct URL hit reads an
  // empty role mid-restore.
  test('awaits the member prefetch before reading member.role [obligation]', async () => {
    let resolvePrefetch
    mockPrefetchMemberById.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePrefetch = resolve
      })
    )
    mockMemberStore.role = 'admin'

    const resultPromise = lessonBeforeEnter()()
    await Promise.resolve()

    resolvePrefetch()
    const result = await resultPromise

    expect(result).toBeUndefined()
  })

  test('redirects non-admins to dashboard [obligation]', async () => {
    mockMemberStore.role = 'member'
    const result = await lessonBeforeEnter()()
    expect(result).toEqual({ name: 'dashboard' })
  })

  test('allows admins through (no redirect) [obligation]', async () => {
    mockMemberStore.role = 'admin'
    const result = await lessonBeforeEnter()()
    expect(result).toBeUndefined()
  })

  test('skips prefetchMemberById when there is no session user id', async () => {
    mockSessionStore.user = undefined
    await lessonBeforeEnter()()
    expect(mockPrefetchMemberById).not.toHaveBeenCalled()
  })
})
