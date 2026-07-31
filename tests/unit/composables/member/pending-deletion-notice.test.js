import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

// ── Module-singleton reset ────────────────────────────────────────────────────
// pending-deletion-notice keeps `current` at module scope so repeat opens
// collapse onto one panel. Re-import fresh between tests that mutate it.

const { mockMember, mockSession, mockNotice, mockQueryCache, mockRouterPush, mockRestoreAccount } =
  vi.hoisted(() => ({
    mockMember: { delete_at: null, pending_deletion: false },
    mockSession: { logout: vi.fn() },
    mockNotice: {
      warn: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
      removeNotice: vi.fn()
    },
    mockQueryCache: { invalidateQueries: vi.fn(), remove: vi.fn() },
    mockRouterPush: vi.fn(),
    mockRestoreAccount: vi.fn()
  }))

vi.mock('@pinia/colada', () => ({ useQueryCache: () => mockQueryCache }))
vi.mock('@/router', () => ({ default: { push: mockRouterPush } }))
vi.mock('@/i18n', () => ({
  t: (key, named) => (named ? `${key}:${JSON.stringify(named)}` : key),
  currentLocale: () => 'en-us'
}))
vi.mock('@/api/session', () => ({ restoreAccount: mockRestoreAccount }))
vi.mock('@/stores/member', () => ({ useMemberStore: () => mockMember }))
vi.mock('@/stores/session', () => ({ useSessionStore: () => mockSession }))
vi.mock('@/stores/notice-store', () => ({ useNoticeStore: () => mockNotice }))
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn() } }))

async function freshComposable() {
  vi.resetModules()
  const { usePendingDeletionNotice } = await import('@/composables/member/pending-deletion-notice')
  return usePendingDeletionNotice()
}

beforeEach(() => {
  mockMember.delete_at = null
  mockMember.pending_deletion = false
  mockSession.logout.mockReset()
  mockNotice.warn.mockReset()
  mockNotice.error.mockReset()
  mockNotice.success.mockReset()
  mockNotice.removeNotice.mockReset()
  mockQueryCache.invalidateQueries.mockReset().mockResolvedValue(undefined)
  mockQueryCache.remove.mockReset()
  mockRouterPush.mockReset()
  mockRestoreAccount.mockReset().mockResolvedValue(undefined)

  let idCounter = 0
  mockNotice.warn.mockImplementation((message, options) => ({
    id: `notice-${idCounter++}`,
    message,
    ...options
  }))
})

describe('usePendingDeletionNotice', () => {
  // ── open() idempotency [obligation] ───────────────────────────────────────

  describe('open() [obligation]', () => {
    test('calling open() repeatedly produces exactly one panel notice, not one per call [obligation]', async () => {
      const { open } = await freshComposable()

      open()
      open()
      open()

      expect(mockNotice.warn).toHaveBeenCalledOnce()
    })

    test('opens a warn notice with the pending-deletion heading + message keys', async () => {
      mockMember.delete_at = '2026-08-05T00:00:00Z'
      const { open } = await freshComposable()

      open()

      expect(mockNotice.warn).toHaveBeenCalledWith(
        'pending-deletion-notice.heading',
        expect.objectContaining({
          variant: 'panel',
          persist: true,
          closable: false
        })
      )
    })
  })

  // ── onDismiss [obligation] ─────────────────────────────────────────────────

  describe('onDismiss [obligation]', () => {
    test('signs the member out when the panel is dismissed while still pending [obligation]', async () => {
      mockMember.pending_deletion = true
      const { open } = await freshComposable()

      open()
      const [, options] = mockNotice.warn.mock.calls[0]
      options.onDismiss()

      expect(mockSession.logout).toHaveBeenCalledOnce()
    })

    test('does NOT sign out on dismiss when pending_deletion is already false (post-recovery) [obligation]', async () => {
      mockMember.pending_deletion = false
      const { open } = await freshComposable()

      open()
      const [, options] = mockNotice.warn.mock.calls[0]
      options.onDismiss()

      expect(mockSession.logout).not.toHaveBeenCalled()
    })

    test('allows re-opening a new panel after a dismiss clears the module singleton', async () => {
      mockMember.pending_deletion = true
      const { open } = await freshComposable()

      open()
      const [, firstOptions] = mockNotice.warn.mock.calls[0]
      firstOptions.onDismiss()

      open()

      expect(mockNotice.warn).toHaveBeenCalledTimes(2)
    })
  })

  // ── onRecover [obligation] ─────────────────────────────────────────────────

  describe('onRecover [obligation]', () => {
    test('invalidates the query cache (never removes) and awaits it before navigating to dashboard [obligation]', async () => {
      const callOrder = []
      mockQueryCache.invalidateQueries.mockImplementationOnce(async () => {
        callOrder.push('invalidate')
      })
      mockRouterPush.mockImplementationOnce(() => callOrder.push('navigate'))
      const { open } = await freshComposable()

      open()
      const [, options] = mockNotice.warn.mock.calls[0]
      const recoverAction = options.actions.find(
        (a) => a.label === 'pending-deletion-notice.recover-button'
      )
      await recoverAction.onClick()

      expect(mockQueryCache.invalidateQueries).toHaveBeenCalledOnce()
      expect(callOrder).toEqual(['invalidate', 'navigate'])
      expect(mockRouterPush).toHaveBeenCalledWith({ name: 'dashboard' })
    })

    test('does NOT call queryCache.remove — invalidate only, never remove [obligation]', async () => {
      const { open } = await freshComposable()

      open()
      const [, options] = mockNotice.warn.mock.calls[0]
      const recoverAction = options.actions.find(
        (a) => a.label === 'pending-deletion-notice.recover-button'
      )
      await recoverAction.onClick()

      expect(mockQueryCache.remove).not.toHaveBeenCalled()
    })

    test('closes the panel and shows a success notice on recovery', async () => {
      const { open } = await freshComposable()

      open()
      const [, options] = mockNotice.warn.mock.calls[0]
      const recoverAction = options.actions.find(
        (a) => a.label === 'pending-deletion-notice.recover-button'
      )
      await recoverAction.onClick()

      expect(mockNotice.removeNotice).toHaveBeenCalledOnce()
      expect(mockNotice.success).toHaveBeenCalledWith('toast.success.account-restored')
    })

    test('does NOT sign the member out on a successful recovery [obligation]', async () => {
      const { open } = await freshComposable()

      open()
      const [, options] = mockNotice.warn.mock.calls[0]
      const recoverAction = options.actions.find(
        (a) => a.label === 'pending-deletion-notice.recover-button'
      )
      await recoverAction.onClick()

      expect(mockSession.logout).not.toHaveBeenCalled()
    })

    test('shows an error notice and does not navigate when restoreAccount rejects', async () => {
      mockRestoreAccount.mockRejectedValueOnce(new Error('grace period expired'))
      const { open } = await freshComposable()

      open()
      const [, options] = mockNotice.warn.mock.calls[0]
      const recoverAction = options.actions.find(
        (a) => a.label === 'pending-deletion-notice.recover-button'
      )
      await recoverAction.onClick()

      expect(mockNotice.error).toHaveBeenCalledWith('toast.error.account-restore-failed')
      expect(mockQueryCache.invalidateQueries).not.toHaveBeenCalled()
      expect(mockRouterPush).not.toHaveBeenCalled()
    })
  })

  // ── the close-then-reopen loop regression [obligation] ─────────────────────

  test('a successful recovery does not leave the guard re-opening the panel — dismiss() clears the singleton so nothing re-triggers it [obligation]', async () => {
    const { open } = await freshComposable()

    open()
    const [, options] = mockNotice.warn.mock.calls[0]
    const recoverAction = options.actions.find(
      (a) => a.label === 'pending-deletion-notice.recover-button'
    )
    await recoverAction.onClick()

    // Simulate the router guard calling open() again on the next navigation
    // (e.g. re-entering the app shell) after member.pending_deletion flips false.
    mockMember.pending_deletion = false
    open()

    expect(mockNotice.warn).toHaveBeenCalledTimes(2)
  })

  // ── sign-out action [obligation] ────────────────────────────────────────────

  test('the sign-out action logs the member out and closes on click', async () => {
    const { open } = await freshComposable()

    open()
    const [, options] = mockNotice.warn.mock.calls[0]
    const signOutAction = options.actions.find(
      (a) => a.label === 'pending-deletion-notice.sign-out-button'
    )
    signOutAction.onClick()

    expect(mockSession.logout).toHaveBeenCalledOnce()
    expect(signOutAction.closesOnClick).toBe(true)
  })
})
