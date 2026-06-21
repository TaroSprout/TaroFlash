import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { setActivePinia, createPinia } from 'pinia'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockGetSession, mockLogin, mockLogout, mockSignupEmail, mockSignInOAuth, mockPush } =
  vi.hoisted(() => ({
    mockGetSession: vi.fn(),
    mockLogin: vi.fn(),
    mockLogout: vi.fn(),
    mockSignupEmail: vi.fn(),
    mockSignInOAuth: vi.fn(),
    mockPush: vi.fn()
  }))

vi.mock('@/api/session', () => ({
  getSession: mockGetSession,
  login: mockLogin,
  logout: mockLogout,
  signupEmail: mockSignupEmail,
  signInOAuth: mockSignInOAuth
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush })
}))

import { useSessionStore } from '@/stores/session'

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  setActivePinia(createPinia())
  mockGetSession.mockReset()
  mockLogin.mockReset()
  mockLogout.mockReset()
  mockSignupEmail.mockReset()
  mockSignInOAuth.mockReset()
  mockPush.mockReset()
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
    test('calls api signInOAuth with the provider', async () => {
      mockSignInOAuth.mockResolvedValueOnce(undefined)
      const store = useSessionStore()
      await store.signInOAuth('google', { redirectTo: '/dashboard' })
      expect(mockSignInOAuth).toHaveBeenCalledWith('google', { redirectTo: '/dashboard' })
    })

    test('redirects to dashboard after OAuth completes', async () => {
      mockSignInOAuth.mockResolvedValueOnce(undefined)
      const store = useSessionStore()
      await store.signInOAuth('google')
      expect(mockPush).toHaveBeenCalledWith({ name: 'dashboard' })
    })

    test('still redirects to dashboard even when OAuth throws', async () => {
      mockSignInOAuth.mockRejectedValueOnce(new Error('popup blocked'))
      const store = useSessionStore()
      await store.signInOAuth('google')
      expect(mockPush).toHaveBeenCalledWith({ name: 'dashboard' })
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
