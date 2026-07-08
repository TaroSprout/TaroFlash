import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockSessionStore, mockMemberStore, mockPrefetchMemberDecks, mockPrefetchMemberById } =
  vi.hoisted(() => ({
    mockSessionStore: { user: { id: 'user-1' }, restoreSession: vi.fn() },
    mockMemberStore: { role: 'member' },
    mockPrefetchMemberDecks: vi.fn(),
    mockPrefetchMemberById: vi.fn()
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

vi.mock('@/views/authenticated.vue', () => ({ default: {} }))

import router from '@/router/index'

// ── Helpers ───────────────────────────────────────────────────────────────────

function findRoute(name) {
  return router.getRoutes().find((r) => r.name === name)
}

beforeEach(() => {
  mockSessionStore.user = { id: 'user-1' }
  mockSessionStore.restoreSession.mockReset().mockResolvedValue(true)
  mockMemberStore.role = 'member'
  mockPrefetchMemberDecks.mockReset()
  mockPrefetchMemberById.mockReset().mockResolvedValue(undefined)
})

describe('router — authenticated route beforeEnter', () => {
  test('redirects to welcome when restoreSession resolves false', async () => {
    mockSessionStore.restoreSession.mockResolvedValueOnce(false)
    const authenticated =
      findRoute('authenticated') ?? router.getRoutes().find((r) => r.path === '/')
    const result = await authenticated.beforeEnter()
    expect(result).toEqual({ name: 'welcome' })
  })

  test('does NOT call prefetchMemberById — the member store query already covers it [obligation]', async () => {
    const authenticated = router.getRoutes().find((r) => r.path === '/')
    await authenticated.beforeEnter()
    expect(mockPrefetchMemberById).not.toHaveBeenCalled()
  })

  test('fires prefetchMemberDecks when authenticated', async () => {
    const authenticated = router.getRoutes().find((r) => r.path === '/')
    await authenticated.beforeEnter()
    expect(mockPrefetchMemberDecks).toHaveBeenCalledOnce()
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
