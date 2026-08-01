import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { setActivePinia, createPinia } from 'pinia'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const {
  mockGetSession,
  mockGetUser,
  mockLogin,
  mockLogout,
  mockSignOutLocal,
  mockSignupEmail,
  mockSignInOAuth,
  mockUpdateEmail,
  mockUpdatePassword,
  mockVerifyPassword,
  mockFetchHasPassword,
  mockRequestReauthCode,
  mockVerifyReauthCode,
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
  mockSignOutLocal: vi.fn(),
  mockSignupEmail: vi.fn(),
  mockSignInOAuth: vi.fn(),
  mockUpdateEmail: vi.fn(),
  mockUpdatePassword: vi.fn(),
  mockVerifyPassword: vi.fn(),
  mockFetchHasPassword: vi.fn(),
  mockRequestReauthCode: vi.fn(),
  mockVerifyReauthCode: vi.fn(),
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

const { mockQueryCache, mockCloseAllModals, mockTaroPhoneReset, mockClearPersistedSession } =
  vi.hoisted(() => ({
    mockQueryCache: { getEntries: vi.fn(() => []), remove: vi.fn() },
    mockCloseAllModals: vi.fn(),
    mockTaroPhoneReset: vi.fn(),
    mockClearPersistedSession: vi.fn()
  }))

const { mockConsumeReturnDestination } = vi.hoisted(() => ({
  mockConsumeReturnDestination: vi.fn()
}))

vi.mock('@/stores/notice-store', () => ({ useNoticeStore: () => mockNotice }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }))
vi.mock('@pinia/colada', () => ({ useQueryCache: () => mockQueryCache }))
vi.mock('@/composables/modal', () => ({ closeAll: mockCloseAllModals }))
vi.mock('@/stores/taro-phone', () => ({ useTaroPhoneStore: () => ({ reset: mockTaroPhoneReset }) }))
vi.mock('@/views/study-session/composables/session-persistence', () => ({
  clearPersistedSession: mockClearPersistedSession
}))
vi.mock('@/composables/auth/return-destination', () => ({
  consumeReturnDestination: mockConsumeReturnDestination
}))

vi.mock('@/api/session', () => ({
  getSession: mockGetSession,
  getUser: mockGetUser,
  login: mockLogin,
  logout: mockLogout,
  signOutLocal: mockSignOutLocal,
  signupEmail: mockSignupEmail,
  signInOAuth: mockSignInOAuth,
  updateEmail: mockUpdateEmail,
  updatePassword: mockUpdatePassword,
  verifyPassword: mockVerifyPassword,
  fetchHasPassword: mockFetchHasPassword,
  requestReauthCode: mockRequestReauthCode,
  verifyReauthCode: mockVerifyReauthCode,
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
  mockSignOutLocal.mockReset()
  mockSignupEmail.mockReset()
  mockSignInOAuth.mockReset()
  mockUpdateEmail.mockReset()
  mockUpdatePassword.mockReset()
  mockVerifyPassword.mockReset()
  mockFetchHasPassword.mockReset()
  mockFetchHasPassword.mockResolvedValue(false)
  mockRequestReauthCode.mockReset()
  mockVerifyReauthCode.mockReset()
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
  mockConsumeReturnDestination.mockReset().mockReturnValue(null)
  mockQueryCache.getEntries.mockReset()
  mockQueryCache.getEntries.mockReturnValue([])
  mockQueryCache.remove.mockReset()
  mockCloseAllModals.mockReset()
  mockTaroPhoneReset.mockReset()
  mockClearPersistedSession.mockReset()
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

    test('[obligation] refreshes hasPassword via fetchHasPassword once authenticated', async () => {
      const user = { id: 'u1', aud: 'authenticated' }
      mockGetSession.mockResolvedValueOnce({ user })
      mockFetchHasPassword.mockResolvedValueOnce(true)
      const store = useSessionStore()

      await store.restoreSession()

      expect(mockFetchHasPassword).toHaveBeenCalledOnce()
      expect(store.hasPassword).toBe(true)
    })

    test('does not call fetchHasPassword when no session is present', async () => {
      mockGetSession.mockResolvedValueOnce(null)
      const store = useSessionStore()

      await store.restoreSession()

      expect(mockFetchHasPassword).not.toHaveBeenCalled()
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

  // ── ensureResolved [obligation] ────────────────────────────────────────────

  describe('ensureResolved [obligation]', () => {
    test('[obligation] concurrent calls share one in-flight promise — getSession runs only once', async () => {
      let resolveGetSession
      mockGetSession.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveGetSession = resolve
        })
      )
      const store = useSessionStore()

      const first = store.ensureResolved()
      const second = store.ensureResolved()

      resolveGetSession({ user: { id: 'u1', aud: 'authenticated' } })
      const [firstResult, secondResult] = await Promise.all([first, second])

      expect(mockGetSession).toHaveBeenCalledOnce()
      expect(firstResult).toBe(true)
      expect(secondResult).toBe(true)
    })

    test('[obligation] a repeat call after the first resolves reuses the memoized answer — no second restore', async () => {
      mockGetSession.mockResolvedValueOnce({ user: { id: 'u1', aud: 'authenticated' } })
      const store = useSessionStore()

      await store.ensureResolved()
      mockGetSession.mockClear()
      const result = await store.ensureResolved()

      expect(mockGetSession).not.toHaveBeenCalled()
      expect(result).toBe(true)
    })

    test('[obligation] a fresh call after reset() (via discardRevokedSession) re-resolves against the new session', async () => {
      mockGetSession.mockResolvedValueOnce({ user: { id: 'u1', aud: 'authenticated' } })
      const store = useSessionStore()
      await store.ensureResolved()

      await store.discardRevokedSession()
      mockGetSession.mockReset().mockResolvedValueOnce(null)
      const result = await store.ensureResolved()

      expect(mockGetSession).toHaveBeenCalledOnce()
      expect(result).toBe(false)
    })

    test('[obligation] a fresh call after onAuthenticated() re-resolves rather than returning the stale answer', async () => {
      mockGetSession.mockResolvedValueOnce(null)
      const store = useSessionStore()
      await store.ensureResolved()

      store.onAuthenticated()
      mockGetSession.mockReset().mockResolvedValueOnce({ user: { id: 'u1', aud: 'authenticated' } })
      const result = await store.ensureResolved()

      expect(mockGetSession).toHaveBeenCalledOnce()
      expect(result).toBe(true)
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

    // [obligation] regression guard — reset() clears the persisted study-session
    // snapshot so the next member signing in on the same tab isn't offered the
    // previous member's session to resume.
    test('[obligation] clears the persisted study-session snapshot and resets hasPassword', async () => {
      const user = { id: 'u1', aud: 'authenticated' }
      mockGetSession.mockResolvedValueOnce({ user })
      mockFetchHasPassword.mockResolvedValueOnce(true)
      mockLogout.mockResolvedValueOnce(undefined)
      const store = useSessionStore()
      await store.restoreSession()
      expect(store.hasPassword).toBe(true)

      await store.logout()

      expect(mockClearPersistedSession).toHaveBeenCalledOnce()
      expect(store.hasPassword).toBe(false)
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
      expect(mockClearPersistedSession).not.toHaveBeenCalled()
    })
  })

  // ── discardRevokedSession [obligation] ────────────────────────────────────

  describe('discardRevokedSession [obligation]', () => {
    test('runs reset() teardown AND drops the locally persisted supabase session [obligation]', async () => {
      const user = { id: 'u1', aud: 'authenticated' }
      mockGetSession.mockResolvedValueOnce({ user })
      mockQueryCache.getEntries.mockReturnValueOnce(['entry-a'])
      const store = useSessionStore()
      await store.restoreSession()

      await store.discardRevokedSession()

      expect(store.user).toBeUndefined()
      expect(mockCloseAllModals).toHaveBeenCalledOnce()
      expect(mockQueryCache.remove).toHaveBeenCalledWith('entry-a')
      expect(mockTaroPhoneReset).toHaveBeenCalledOnce()
      expect(mockClearPersistedSession).toHaveBeenCalledOnce()
      expect(mockSignOutLocal).toHaveBeenCalledOnce()
    })

    test('runs reset() before dropping the local supabase session [obligation]', async () => {
      const callOrder = []
      mockQueryCache.remove.mockImplementationOnce(() => callOrder.push('reset'))
      mockSignOutLocal.mockImplementationOnce(async () => callOrder.push('signOutLocal'))
      mockQueryCache.getEntries.mockReturnValueOnce(['entry-a'])
      const store = useSessionStore()

      await store.discardRevokedSession()

      expect(callOrder).toEqual(['reset', 'signOutLocal'])
    })

    test('holds the intentional-logout flag across reset() AND the local sign-out, so the SIGNED_OUT event does not trigger forceLogout [obligation]', async () => {
      const user = { id: 'u1', aud: 'authenticated' }
      mockGetSession.mockResolvedValueOnce({ user })
      let staleTabCallback
      mockOnSignedOut.mockImplementationOnce((cb) => {
        staleTabCallback = cb
        return vi.fn()
      })
      let resolveSignOutLocal
      mockSignOutLocal.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSignOutLocal = resolve
          })
      )
      const store = useSessionStore()
      await store.restoreSession()

      const discardPromise = store.discardRevokedSession()

      // Fire the SIGNED_OUT event mid-teardown, before signOutLocal resolves.
      staleTabCallback()
      await Promise.resolve()

      expect(mockNotice.warn).not.toHaveBeenCalled()

      resolveSignOutLocal()
      await discardPromise
    })

    test('does not stack a forced-logout notice on the caller messaging after teardown completes [obligation]', async () => {
      mockSignOutLocal.mockResolvedValueOnce(undefined)
      const store = useSessionStore()

      await store.discardRevokedSession()

      expect(mockNotice.warn).not.toHaveBeenCalled()
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
    test('closes all modals AND routes to dashboard when no return destination was captured [obligation]', () => {
      mockConsumeReturnDestination.mockReturnValue(null)
      const store = useSessionStore()
      store.onAuthenticated()
      expect(mockCloseAllModals).toHaveBeenCalledOnce()
      expect(mockPush).toHaveBeenCalledWith({ name: 'dashboard' })
    })

    // [obligation] consumes the captured `?next=` destination and pushes it
    // instead of the dashboard fallback when one was stashed.
    test('[obligation] pushes the consumed return destination when one is present', () => {
      mockConsumeReturnDestination.mockReturnValue('/deck/123')
      const store = useSessionStore()
      store.onAuthenticated()
      expect(mockPush).toHaveBeenCalledWith('/deck/123')
      expect(mockPush).not.toHaveBeenCalledWith({ name: 'dashboard' })
    })

    // [obligation] the resolution memo is cleared before navigating so the
    // checkpoint on the very next navigation reflects the new session rather
    // than the memoized signed-out answer from before this sign-in.
    test('[obligation] clears the ensureResolved memo before pushing, so the next call re-resolves', async () => {
      mockGetSession.mockResolvedValueOnce(null)
      const store = useSessionStore()
      await store.ensureResolved()

      store.onAuthenticated()
      mockGetSession.mockReset().mockResolvedValueOnce({ user: { id: 'u1', aud: 'authenticated' } })
      const result = await store.ensureResolved()

      expect(mockGetSession).toHaveBeenCalledOnce()
      expect(result).toBe(true)
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

  // ── hasPassword — RPC-backed, independent of hasPasswordIdentity [obligation] ──

  describe('hasPassword vs hasPasswordIdentity [obligation]', () => {
    // [obligation] the branch key for the password-change UI is session.hasPassword
    // (RPC-backed), not hasPasswordIdentity. GoTrue creates no 'email' identity
    // when a password is set on a Google-origin account, so hasPasswordIdentity
    // stays false forever even though the account can sign in with a password.
    test('[obligation] hasPassword is true for a google-only account whose member_has_password() RPC returns true', async () => {
      const user = {
        id: 'u1',
        aud: 'authenticated',
        identities: [{ provider: 'google' }]
      }
      mockGetSession.mockResolvedValueOnce({ user })
      mockFetchHasPassword.mockResolvedValueOnce(true)
      const store = useSessionStore()

      await store.restoreSession()

      expect(store.hasPasswordIdentity).toBe(false)
      expect(store.hasGoogleIdentity).toBe(true)
      expect(store.hasPassword).toBe(true)
    })

    test('hasPassword is false initially, before any refresh', () => {
      const store = useSessionStore()
      expect(store.hasPassword).toBe(false)
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

    // [obligation] has_password refreshes after a successful password change —
    // Google-only → set password → next change asks for the current password.
    test('[obligation] refreshes hasPassword via fetchHasPassword on a "success" outcome', async () => {
      mockUpdatePassword.mockResolvedValueOnce('success')
      mockFetchHasPassword.mockResolvedValueOnce(true)
      const store = useSessionStore()

      await store.updatePassword('hunter22')

      expect(mockFetchHasPassword).toHaveBeenCalledOnce()
      expect(store.hasPassword).toBe(true)
    })

    test('[obligation] does NOT refresh hasPassword on "weak-password"', async () => {
      mockUpdatePassword.mockResolvedValueOnce('weak-password')
      const store = useSessionStore()

      await store.updatePassword('weak')

      expect(mockFetchHasPassword).not.toHaveBeenCalled()
    })

    test('[obligation] does NOT refresh hasPassword on "same-password"', async () => {
      mockUpdatePassword.mockResolvedValueOnce('same-password')
      const store = useSessionStore()

      await store.updatePassword('hunter22')

      expect(mockFetchHasPassword).not.toHaveBeenCalled()
    })

    test('[obligation] does NOT refresh hasPassword on "error"', async () => {
      mockUpdatePassword.mockResolvedValueOnce('error')
      const store = useSessionStore()

      await store.updatePassword('hunter22')

      expect(mockFetchHasPassword).not.toHaveBeenCalled()
    })
  })

  // ── verifyPassword / requestReauthCode / verifyReauthCode ─────────────────

  describe('verifyPassword', () => {
    test('delegates to api verifyPassword and returns the outcome', async () => {
      mockVerifyPassword.mockResolvedValueOnce('success')
      const store = useSessionStore()
      const result = await store.verifyPassword('hunter22')
      expect(result).toBe('success')
      expect(mockVerifyPassword).toHaveBeenCalledWith('hunter22')
    })
  })

  describe('requestReauthCode', () => {
    test('delegates to api requestReauthCode and returns the outcome', async () => {
      mockRequestReauthCode.mockResolvedValueOnce('success')
      const store = useSessionStore()
      const result = await store.requestReauthCode()
      expect(result).toBe('success')
      expect(mockRequestReauthCode).toHaveBeenCalledOnce()
    })
  })

  describe('verifyReauthCode', () => {
    test('delegates to api verifyReauthCode and returns the outcome', async () => {
      mockVerifyReauthCode.mockResolvedValueOnce('success')
      const store = useSessionStore()
      const result = await store.verifyReauthCode('123456')
      expect(result).toBe('success')
      expect(mockVerifyReauthCode).toHaveBeenCalledWith('123456')
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

  describe('forceLogout reason copy', () => {
    async function authenticatedStore() {
      mockGetSession.mockResolvedValueOnce({ user: { id: 'u1', aud: 'authenticated' } })
      mockLogout.mockResolvedValueOnce(undefined)
      const store = useSessionStore()
      await store.restoreSession()
      return store
    }

    test('defaults to the session-expired copy with no sub-message', async () => {
      const store = await authenticatedStore()

      await store.forceLogout()

      expect(mockNotice.warn).toHaveBeenCalledWith(
        'session.expired-error',
        expect.objectContaining({ subMessage: undefined, variant: 'panel' })
      )
    })

    test('uses the account-deleted copy when that reason is given', async () => {
      const store = await authenticatedStore()

      await store.forceLogout('account-deleted')

      expect(mockNotice.warn).toHaveBeenCalledWith(
        'member.account-deleted',
        expect.objectContaining({
          subMessage: 'member.account-deleted-sub',
          variant: 'panel',
          persist: true,
          closable: false
        })
      )
    })

    test('account-deleted runs the same teardown and welcome redirect as any forced logout', async () => {
      const store = await authenticatedStore()

      await store.forceLogout('account-deleted')

      expect(store.user).toBeUndefined()
      expect(mockCloseAllModals).toHaveBeenCalled()
      expect(mockTaroPhoneReset).toHaveBeenCalled()
      expect(mockLogout).toHaveBeenCalledOnce()

      const [, options] = mockNotice.warn.mock.calls[0]
      options.onDismiss()

      expect(mockPush).toHaveBeenCalledWith({ name: 'welcome' })
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

  // ── public surface [obligation] ───────────────────────────────────────────

  test('does not export a bare reset() — only discardRevokedSession() [obligation]', () => {
    const store = useSessionStore()
    expect(store.reset).toBeUndefined()
    expect(typeof store.discardRevokedSession).toBe('function')
  })
})
