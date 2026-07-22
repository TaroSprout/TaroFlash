import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { setActivePinia, createPinia } from 'pinia'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const {
  mockGetSession,
  mockGetUser,
  mockLogin,
  mockLogout,
  mockSignupEmail,
  mockSignInOAuth,
  mockUpdateEmail,
  mockUpdatePassword,
  mockRequestPasswordReset,
  mockLinkGoogleIdentity,
  mockUnlinkGoogleIdentity,
  mockIsPasswordRecoveryUrl,
  mockWaitForPasswordRecovery,
  mockPush
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetUser: vi.fn(),
  mockLogin: vi.fn(),
  mockLogout: vi.fn(),
  mockSignupEmail: vi.fn(),
  mockSignInOAuth: vi.fn(),
  mockUpdateEmail: vi.fn(),
  mockUpdatePassword: vi.fn(),
  mockRequestPasswordReset: vi.fn(),
  mockLinkGoogleIdentity: vi.fn(),
  mockUnlinkGoogleIdentity: vi.fn(),
  mockIsPasswordRecoveryUrl: vi.fn(),
  mockWaitForPasswordRecovery: vi.fn(),
  mockPush: vi.fn()
}))

const { mockNotice } = vi.hoisted(() => ({
  mockNotice: { error: vi.fn(), success: vi.fn(), warn: vi.fn() }
}))

const { mockOnSignedOut, mockIsAuthError } = vi.hoisted(() => ({
  mockOnSignedOut: vi.fn(() => vi.fn()),
  mockIsAuthError: vi.fn()
}))

const { mockQueryCache, mockCloseAllModals, mockTaroPhoneReset } = vi.hoisted(() => ({
  mockQueryCache: { getEntries: vi.fn(() => []), remove: vi.fn() },
  mockCloseAllModals: vi.fn(),
  mockTaroPhoneReset: vi.fn()
}))

vi.mock('@/stores/notice-store', () => ({ useNoticeStore: () => mockNotice }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }))
vi.mock('@pinia/colada', () => ({ useQueryCache: () => mockQueryCache }))
vi.mock('@/composables/modal', () => ({ closeAll: mockCloseAllModals }))
vi.mock('@/stores/taro-phone', () => ({ useTaroPhoneStore: () => ({ reset: mockTaroPhoneReset }) }))

vi.mock('@/api/session', () => ({
  getSession: mockGetSession,
  getUser: mockGetUser,
  login: mockLogin,
  logout: mockLogout,
  signupEmail: mockSignupEmail,
  signInOAuth: mockSignInOAuth,
  updateEmail: mockUpdateEmail,
  updatePassword: mockUpdatePassword,
  requestPasswordReset: mockRequestPasswordReset,
  linkGoogleIdentity: mockLinkGoogleIdentity,
  unlinkGoogleIdentity: mockUnlinkGoogleIdentity,
  isPasswordRecoveryUrl: mockIsPasswordRecoveryUrl,
  waitForPasswordRecovery: mockWaitForPasswordRecovery,
  onSignedOut: mockOnSignedOut,
  isAuthError: mockIsAuthError
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush })
}))

import { useSessionStore } from '@/stores/session'

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  setActivePinia(createPinia())
  mockGetSession.mockReset()
  mockGetUser.mockReset()
  mockLogin.mockReset()
  mockLogout.mockReset()
  mockSignupEmail.mockReset()
  mockSignInOAuth.mockReset()
  mockUpdateEmail.mockReset()
  mockUpdatePassword.mockReset()
  mockRequestPasswordReset.mockReset()
  mockLinkGoogleIdentity.mockReset()
  mockUnlinkGoogleIdentity.mockReset()
  mockIsPasswordRecoveryUrl.mockReset()
  mockWaitForPasswordRecovery.mockReset()
  mockPush.mockReset()
  mockNotice.error.mockReset()
  mockNotice.warn.mockReset()
  mockOnSignedOut.mockReset()
  mockOnSignedOut.mockImplementation(() => vi.fn())
  mockIsAuthError.mockReset()
  mockQueryCache.getEntries.mockReset()
  mockQueryCache.getEntries.mockReturnValue([])
  mockQueryCache.remove.mockReset()
  mockCloseAllModals.mockReset()
  mockTaroPhoneReset.mockReset()
})

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useSessionStore', () => {
  // ── initial state ──────────────────────────────────────────────────────────

  test('user is undefined initially', () => {
    const store = useSessionStore()
    expect(store.user).toBeUndefined()
  })

  test('authenticated is false initially', () => {
    const store = useSessionStore()
    expect(store.authenticated).toBe(false)
  })

  test('isLoading is false initially', () => {
    const store = useSessionStore()
    expect(store.isLoading).toBe(false)
  })

  // ── restoreSession ─────────────────────────────────────────────────────────

  describe('restoreSession', () => {
    test('returns false when getSession returns null (no session)', async () => {
      mockGetSession.mockResolvedValueOnce(null)
      const store = useSessionStore()
      const result = await store.restoreSession()
      expect(result).toBe(false)
    })

    test('sets user and returns true when a session exists', async () => {
      const user = { id: 'u1', aud: 'authenticated' }
      mockGetSession.mockResolvedValueOnce({ user })
      const store = useSessionStore()
      const result = await store.restoreSession()
      expect(store.user).toEqual(user)
      expect(result).toBe(true)
    })

    test('returns false and does not throw when getSession throws', async () => {
      mockGetSession.mockRejectedValueOnce(new Error('network error'))
      const store = useSessionStore()
      const result = await store.restoreSession()
      expect(result).toBe(false)
    })

    test('isLoading is false after restoreSession completes', async () => {
      mockGetSession.mockResolvedValueOnce(null)
      const store = useSessionStore()
      await store.restoreSession()
      expect(store.isLoading).toBe(false)
    })

    test('skips getSession call when already authenticated', async () => {
      const user = { id: 'u1', aud: 'authenticated' }
      mockGetSession.mockResolvedValueOnce({ user })
      const store = useSessionStore()
      // First call sets user and authenticates
      await store.restoreSession()
      mockGetSession.mockClear()
      // Second call should skip the API call
      await store.restoreSession()
      expect(mockGetSession).not.toHaveBeenCalled()
    })
  })

  // ── checkPasswordRecovery ──────────────────────────────────────────────────

  describe('checkPasswordRecovery [obligation]', () => {
    test('short-circuits to false without calling waitForPasswordRecovery when isPasswordRecoveryUrl is false [obligation]', async () => {
      mockIsPasswordRecoveryUrl.mockReturnValueOnce(false)
      const store = useSessionStore()

      const result = await store.checkPasswordRecovery()

      expect(result).toBe(false)
      expect(mockWaitForPasswordRecovery).not.toHaveBeenCalled()
    })

    test('returns whatever waitForPasswordRecovery resolves when isPasswordRecoveryUrl is true [obligation]', async () => {
      mockIsPasswordRecoveryUrl.mockReturnValueOnce(true)
      mockWaitForPasswordRecovery.mockResolvedValueOnce(true)
      const store = useSessionStore()

      const result = await store.checkPasswordRecovery()

      expect(result).toBe(true)
      expect(mockWaitForPasswordRecovery).toHaveBeenCalledOnce()
    })

    test('returns false when isPasswordRecoveryUrl is true but waitForPasswordRecovery resolves false [obligation]', async () => {
      mockIsPasswordRecoveryUrl.mockReturnValueOnce(true)
      mockWaitForPasswordRecovery.mockResolvedValueOnce(false)
      const store = useSessionStore()

      const result = await store.checkPasswordRecovery()

      expect(result).toBe(false)
    })
  })

  // ── login ──────────────────────────────────────────────────────────────────

  describe('login', () => {
    test('calls the api login with email and password', async () => {
      mockLogin.mockResolvedValueOnce({ user: { id: 'u1' } })
      const store = useSessionStore()
      await store.login('user@example.com', 'password1')
      expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'password1')
    })

    test('propagates errors from api login', async () => {
      mockLogin.mockRejectedValueOnce(new Error('invalid credentials'))
      const store = useSessionStore()
      await expect(store.login('user@example.com', 'pw')).rejects.toThrow('invalid credentials')
    })
  })

  // ── logout ─────────────────────────────────────────────────────────────────

  describe('logout', () => {
    test('clears user state and redirects to welcome', async () => {
      const user = { id: 'u1', aud: 'authenticated' }
      mockGetSession.mockResolvedValueOnce({ user })
      mockLogout.mockResolvedValueOnce(undefined)
      const store = useSessionStore()
      await store.restoreSession()

      await store.logout()

      expect(store.user).toBeUndefined()
      expect(mockPush).toHaveBeenCalledWith({ name: 'welcome' })
    })

    test('shows an error notice and does NOT reset user or navigate when supaLogout rejects [obligation]', async () => {
      const user = { id: 'u1', aud: 'authenticated' }
      mockGetSession.mockResolvedValueOnce({ user })
      mockLogout.mockRejectedValueOnce(new Error('network down'))
      const store = useSessionStore()
      await store.restoreSession()

      await store.logout()

      expect(mockNotice.error).toHaveBeenCalledWith('session.logout-error')
      expect(store.user).toEqual(user)
      expect(mockPush).not.toHaveBeenCalledWith({ name: 'welcome' })
    })

    test('runs the full teardown — closes modals, clears the query cache, resets the phone [obligation]', async () => {
      const user = { id: 'u1', aud: 'authenticated' }
      mockGetSession.mockResolvedValueOnce({ user })
      mockLogout.mockResolvedValueOnce(undefined)
      mockQueryCache.getEntries.mockReturnValueOnce(['entry-a', 'entry-b'])
      const store = useSessionStore()
      await store.restoreSession()

      await store.logout()

      expect(mockCloseAllModals).toHaveBeenCalledOnce()
      expect(mockQueryCache.remove).toHaveBeenCalledWith('entry-a')
      expect(mockQueryCache.remove).toHaveBeenCalledWith('entry-b')
      expect(mockTaroPhoneReset).toHaveBeenCalledOnce()
    })

    test('does NOT run teardown when supaLogout rejects (no reset reached) [obligation]', async () => {
      const user = { id: 'u1', aud: 'authenticated' }
      mockGetSession.mockResolvedValueOnce({ user })
      mockLogout.mockRejectedValueOnce(new Error('network down'))
      const store = useSessionStore()
      await store.restoreSession()

      await store.logout()

      expect(mockCloseAllModals).not.toHaveBeenCalled()
      expect(mockTaroPhoneReset).not.toHaveBeenCalled()
    })
  })

  // ── signupEmail ────────────────────────────────────────────────────────────

  describe('signupEmail', () => {
    test('delegates to api signupEmail and returns the outcome', async () => {
      mockSignupEmail.mockResolvedValueOnce('success')
      const store = useSessionStore()
      const result = await store.signupEmail('user@example.com', 'pw', { display_name: 'Alice' })
      expect(result).toBe('success')
      expect(mockSignupEmail).toHaveBeenCalledWith('user@example.com', 'pw', {
        display_name: 'Alice'
      })
    })

    test('passes through email-taken outcome', async () => {
      mockSignupEmail.mockResolvedValueOnce('email-taken')
      const store = useSessionStore()
      const result = await store.signupEmail('user@example.com', 'pw')
      expect(result).toBe('email-taken')
    })
  })

  // ── signInOAuth ────────────────────────────────────────────────────────────

  describe('signInOAuth', () => {
    test('calls api signInOAuth with only the provider [obligation]', async () => {
      mockSignInOAuth.mockResolvedValueOnce('success')
      const store = useSessionStore()
      await store.signInOAuth('google')
      expect(mockSignInOAuth).toHaveBeenCalledWith('google')
    })

    // [obligation] on api 'success' the store routes through the single
    // onAuthenticated() funnel — closes modals AND navigates to dashboard.
    test('on "success" outcome, calls onAuthenticated — closes modals and routes to dashboard [obligation]', async () => {
      mockSignInOAuth.mockResolvedValueOnce('success')
      const store = useSessionStore()
      await store.signInOAuth('google')
      expect(mockCloseAllModals).toHaveBeenCalledOnce()
      expect(mockPush).toHaveBeenCalledWith({ name: 'dashboard' })
    })

    test('on "error" outcome, does NOT navigate or close modals [obligation]', async () => {
      mockSignInOAuth.mockResolvedValueOnce('error')
      const store = useSessionStore()
      await store.signInOAuth('google')
      expect(mockPush).not.toHaveBeenCalledWith({ name: 'dashboard' })
      expect(mockCloseAllModals).not.toHaveBeenCalled()
    })

    test('on "error" outcome, shows the generic login-error notice [obligation]', async () => {
      mockSignInOAuth.mockResolvedValueOnce('error')
      const store = useSessionStore()
      await store.signInOAuth('google')
      expect(mockNotice.error).toHaveBeenCalledWith('login-dialog.errors.generic')
    })
  })

  // ── onAuthenticated ────────────────────────────────────────────────────────

  describe('onAuthenticated [obligation]', () => {
    // [obligation] single post-auth funnel: every successful sign-in path routes
    // through this so no path can navigate without tearing down its modal.
    test('closes all modals AND routes to dashboard [obligation]', () => {
      const store = useSessionStore()
      store.onAuthenticated()
      expect(mockCloseAllModals).toHaveBeenCalledOnce()
      expect(mockPush).toHaveBeenCalledWith({ name: 'dashboard' })
    })
  })

  // ── identities ─────────────────────────────────────────────────────────────

  describe('hasGoogleIdentity / hasPasswordIdentity', () => {
    test('are both false when there is no user', () => {
      const store = useSessionStore()
      expect(store.hasGoogleIdentity).toBe(false)
      expect(store.hasPasswordIdentity).toBe(false)
    })

    test('reflect the identities on the current user', async () => {
      const user = {
        id: 'u1',
        aud: 'authenticated',
        identities: [{ provider: 'email' }, { provider: 'google' }]
      }
      mockGetSession.mockResolvedValueOnce({ user })
      const store = useSessionStore()
      await store.restoreSession()

      expect(store.hasGoogleIdentity).toBe(true)
      expect(store.hasPasswordIdentity).toBe(true)
    })

    test('[obligation] update reactively when the underlying user identities change, without recomputing the store', async () => {
      const store = useSessionStore()
      expect(store.hasGoogleIdentity).toBe(false)

      mockGetUser.mockResolvedValueOnce({
        id: 'u1',
        aud: 'authenticated',
        identities: [{ provider: 'google' }]
      })
      await store.linkGoogleIdentity()

      expect(store.hasGoogleIdentity).toBe(true)
    })
  })

  // ── updateEmail ────────────────────────────────────────────────────────────

  describe('updateEmail', () => {
    test('delegates to api updateEmail and returns the outcome', async () => {
      mockUpdateEmail.mockResolvedValueOnce('success')
      const store = useSessionStore()
      const result = await store.updateEmail('new@example.com')
      expect(result).toBe('success')
      expect(mockUpdateEmail).toHaveBeenCalledWith('new@example.com')
    })
  })

  // ── updatePassword ─────────────────────────────────────────────────────────

  describe('updatePassword', () => {
    test('delegates to api updatePassword and returns the outcome', async () => {
      mockUpdatePassword.mockResolvedValueOnce('success')
      const store = useSessionStore()
      const result = await store.updatePassword('hunter22')
      expect(result).toBe('success')
      expect(mockUpdatePassword).toHaveBeenCalledWith('hunter22')
    })
  })

  // ── requestPasswordReset ──────────────────────────────────────────────────

  describe('requestPasswordReset', () => {
    test('delegates to api requestPasswordReset and returns the outcome', async () => {
      mockRequestPasswordReset.mockResolvedValueOnce('success')
      const store = useSessionStore()
      const result = await store.requestPasswordReset('user@example.com')
      expect(result).toBe('success')
      expect(mockRequestPasswordReset).toHaveBeenCalledWith('user@example.com')
    })
  })

  // ── linkGoogleIdentity / unlinkGoogleIdentity ─────────────────────────────

  describe('linkGoogleIdentity', () => {
    test('[obligation] refreshes the user via getUser (not getSession) after linking', async () => {
      mockLinkGoogleIdentity.mockResolvedValueOnce(undefined)
      mockGetUser.mockResolvedValueOnce({ id: 'u1', aud: 'authenticated' })
      const store = useSessionStore()

      await store.linkGoogleIdentity()

      expect(mockLinkGoogleIdentity).toHaveBeenCalledOnce()
      expect(mockGetUser).toHaveBeenCalledOnce()
      expect(mockGetSession).not.toHaveBeenCalled()
      expect(store.user).toEqual({ id: 'u1', aud: 'authenticated' })
    })
  })

  describe('unlinkGoogleIdentity', () => {
    test('[obligation] refreshes the user via getUser (not getSession) after unlinking', async () => {
      mockUnlinkGoogleIdentity.mockResolvedValueOnce(undefined)
      mockGetUser.mockResolvedValueOnce({ id: 'u1', aud: 'authenticated', identities: [] })
      const store = useSessionStore()

      await store.unlinkGoogleIdentity()

      expect(mockUnlinkGoogleIdentity).toHaveBeenCalledOnce()
      expect(mockGetUser).toHaveBeenCalledOnce()
      expect(mockGetSession).not.toHaveBeenCalled()
      expect(store.hasGoogleIdentity).toBe(false)
    })
  })

  // ── handleAuthError / forceLogout [obligation] ────────────────────────────

  describe('handleAuthError [obligation]', () => {
    test('forces a logout when isAuthError returns true [obligation]', async () => {
      const user = { id: 'u1', aud: 'authenticated' }
      mockGetSession.mockResolvedValueOnce({ user })
      mockIsAuthError.mockReturnValueOnce(true)
      mockLogout.mockResolvedValueOnce(undefined)
      const store = useSessionStore()
      await store.restoreSession()

      store.handleAuthError({ status: 401 })
      await Promise.resolve()

      expect(store.user).toBeUndefined()
      expect(mockNotice.warn).toHaveBeenCalledOnce()
    })

    test('does NOT force a logout when isAuthError returns false [obligation]', async () => {
      const user = { id: 'u1', aud: 'authenticated' }
      mockGetSession.mockResolvedValueOnce({ user })
      mockIsAuthError.mockReturnValueOnce(false)
      const store = useSessionStore()
      await store.restoreSession()

      store.handleAuthError({ status: 500 })
      await Promise.resolve()

      expect(store.user).toEqual(user)
      expect(mockNotice.warn).not.toHaveBeenCalled()
    })
  })

  describe('forceLogout guard [obligation]', () => {
    test('is a no-op when already logged out, preventing its own supaLogout from re-triggering it [obligation]', async () => {
      // Store is never authenticated in this test (no restoreSession call).
      mockIsAuthError.mockReturnValueOnce(true)
      const store = useSessionStore()

      store.handleAuthError({ status: 401 })
      await Promise.resolve()

      expect(mockLogout).not.toHaveBeenCalled()
      expect(mockNotice.warn).not.toHaveBeenCalled()
    })

    test('shows a panel notice whose onDismiss navigates to welcome, not immediately [obligation]', async () => {
      const user = { id: 'u1', aud: 'authenticated' }
      mockGetSession.mockResolvedValueOnce({ user })
      mockIsAuthError.mockReturnValueOnce(true)
      mockLogout.mockResolvedValueOnce(undefined)
      const store = useSessionStore()
      await store.restoreSession()

      store.handleAuthError({ status: 401 })
      await Promise.resolve()

      expect(mockNotice.warn).toHaveBeenCalledWith(
        'session.expired-error',
        expect.objectContaining({ variant: 'panel' })
      )
      expect(mockPush).not.toHaveBeenCalledWith({ name: 'welcome' })

      const [, options] = mockNotice.warn.mock.calls[0]
      options.onDismiss()

      expect(mockPush).toHaveBeenCalledWith({ name: 'welcome' })
    })

    test('forced session-loss runs the same teardown as logout [obligation]', async () => {
      const user = { id: 'u1', aud: 'authenticated' }
      mockGetSession.mockResolvedValueOnce({ user })
      mockIsAuthError.mockReturnValueOnce(true)
      mockLogout.mockResolvedValueOnce(undefined)
      mockQueryCache.getEntries.mockReturnValueOnce(['entry-a'])
      const store = useSessionStore()
      await store.restoreSession()

      store.handleAuthError({ status: 401 })
      await Promise.resolve()

      expect(mockCloseAllModals).toHaveBeenCalledOnce()
      expect(mockQueryCache.remove).toHaveBeenCalledWith('entry-a')
      expect(mockTaroPhoneReset).toHaveBeenCalledOnce()
    })
  })

  describe('onSignedOut wiring [obligation]', () => {
    test('forces a logout when the stale-tab listener fires and we are not already logging out [obligation]', async () => {
      const user = { id: 'u1', aud: 'authenticated' }
      mockGetSession.mockResolvedValueOnce({ user })
      mockLogout.mockResolvedValueOnce(undefined)
      let staleTabCallback
      mockOnSignedOut.mockImplementationOnce((cb) => {
        staleTabCallback = cb
        return vi.fn()
      })
      const store = useSessionStore()
      await store.restoreSession()

      staleTabCallback()
      await Promise.resolve()

      expect(store.user).toBeUndefined()
      expect(mockNotice.warn).toHaveBeenCalledOnce()
    })

    test('manual logout() does not trigger the forced/expired panel notice path [obligation]', async () => {
      const user = { id: 'u1', aud: 'authenticated' }
      mockGetSession.mockResolvedValueOnce({ user })
      mockLogout.mockResolvedValueOnce(undefined)
      const store = useSessionStore()
      await store.restoreSession()

      await store.logout()

      expect(mockNotice.warn).not.toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith({ name: 'welcome' })
    })
  })

  // ── startLoading / stopLoading ─────────────────────────────────────────────

  describe('loading counter', () => {
    test('isLoading becomes true after startLoading', () => {
      const store = useSessionStore()
      store.startLoading()
      expect(store.isLoading).toBe(true)
    })

    test('isLoading returns to false after matching stopLoading', () => {
      const store = useSessionStore()
      store.startLoading()
      store.stopLoading()
      expect(store.isLoading).toBe(false)
    })
  })
})
