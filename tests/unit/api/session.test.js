import { describe, test, expect, beforeEach, afterEach, vi } from 'vite-plus/test'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUser: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
  signInWithOAuth: vi.fn(),
  linkIdentity: vi.fn(),
  unlinkIdentity: vi.fn(),
  getUserIdentities: vi.fn(),
  refreshSession: vi.fn(),
  updateUser: vi.fn(),
  onAuthStateChange: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  signInWithOtp: vi.fn(),
  verifyOtp: vi.fn(),
  rpc: vi.fn(),
  invoke: vi.fn()
}))

vi.mock('@/supabase-client', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      getUser: mocks.getUser,
      signInWithPassword: mocks.signInWithPassword,
      signOut: mocks.signOut,
      signUp: mocks.signUp,
      signInWithOAuth: mocks.signInWithOAuth,
      linkIdentity: mocks.linkIdentity,
      unlinkIdentity: mocks.unlinkIdentity,
      getUserIdentities: mocks.getUserIdentities,
      refreshSession: mocks.refreshSession,
      updateUser: mocks.updateUser,
      onAuthStateChange: mocks.onAuthStateChange,
      resetPasswordForEmail: mocks.resetPasswordForEmail,
      signInWithOtp: mocks.signInWithOtp,
      verifyOtp: mocks.verifyOtp
    },
    rpc: mocks.rpc,
    functions: { invoke: mocks.invoke }
  }
}))

vi.mock('@/utils/logger', () => ({ default: { error: vi.fn() } }))

import {
  getSession,
  getUser,
  login,
  logout,
  signOutLocal,
  signOutOthers,
  requestAccountDeletion,
  restoreAccount,
  signupEmail,
  isDisplayNameAvailable,
  signInOAuth,
  linkGoogleIdentity,
  unlinkGoogleIdentity,
  updateEmail,
  fetchHasPassword,
  verifyPassword,
  requestReauthCode,
  verifyReauthCode,
  updatePassword,
  isPasswordRecoveryUrl,
  waitForPasswordRecovery,
  requestPasswordReset,
  isAuthError,
  onSignedOut,
  consumeOAuthPopupFlag,
  isNewAccountSession
} from '@/api/session'
import logger from '@/utils/logger'

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset())
  global.__matchMedia.matches = false
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 })
})

describe('getSession', () => {
  test('returns the session on success', async () => {
    const session = { user: { id: 'u1' } }
    mocks.getSession.mockResolvedValueOnce({ data: { session }, error: null })
    await expect(getSession()).resolves.toEqual(session)
  })

  test('returns null when no session is present', async () => {
    mocks.getSession.mockResolvedValueOnce({ data: { session: null }, error: null })
    await expect(getSession()).resolves.toBeNull()
  })

  test('throws when supabase returns an error', async () => {
    mocks.getSession.mockResolvedValueOnce({ data: null, error: { message: 'nope' } })
    await expect(getSession()).rejects.toThrow('nope')
  })

  test('resolves with the session when supabase.auth.getSession() settles before the timeout', async () => {
    vi.useFakeTimers()
    const session = { user: { id: 'u1' } }
    mocks.getSession.mockResolvedValueOnce({ data: { session }, error: null })

    const promise = getSession()
    await vi.advanceTimersByTimeAsync(0)

    await expect(promise).resolves.toEqual(session)
    vi.useRealTimers()
  })

  test('rejects once the 2s timeout elapses when supabase.auth.getSession() never resolves', async () => {
    vi.useFakeTimers()
    mocks.getSession.mockImplementationOnce(() => new Promise(() => {}))

    const promise = getSession()
    promise.catch(() => {})
    await vi.advanceTimersByTimeAsync(2000)

    await expect(promise).rejects.toThrow('getSession timed out')
    vi.useRealTimers()
  })
})

describe('getUser', () => {
  test('returns the user on success', async () => {
    const user = { id: 'u1' }
    mocks.getUser.mockResolvedValueOnce({ data: { user }, error: null })
    await expect(getUser()).resolves.toEqual(user)
  })

  test('returns null when no user is present', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null })
    await expect(getUser()).resolves.toBeNull()
  })

  test('throws when supabase returns an error', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: null, error: { message: 'nope' } })
    await expect(getUser()).rejects.toThrow('nope')
  })
})

describe('isNewAccountSession', () => {
  const NOW = new Date('2026-01-01T00:00:00.000Z').getTime()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('returns false when there is no session', async () => {
    mocks.getSession.mockResolvedValueOnce({ data: { session: null }, error: null })
    await expect(isNewAccountSession()).resolves.toBe(false)
  })

  test('returns true when created_at is 29_999ms before now, just inside the 30_000ms window', async () => {
    const created_at = new Date(NOW - 29_999).toISOString()
    mocks.getSession.mockResolvedValueOnce({
      data: { session: { user: { created_at } } },
      error: null
    })
    await expect(isNewAccountSession()).resolves.toBe(true)
  })

  test('returns false when created_at is exactly 30_000ms before now, at the boundary', async () => {
    const created_at = new Date(NOW - 30_000).toISOString()
    mocks.getSession.mockResolvedValueOnce({
      data: { session: { user: { created_at } } },
      error: null
    })
    await expect(isNewAccountSession()).resolves.toBe(false)
  })

  test('returns false when created_at is well before the 30_000ms window, a returning account', async () => {
    const created_at = new Date(NOW - 60_000).toISOString()
    mocks.getSession.mockResolvedValueOnce({
      data: { session: { user: { created_at } } },
      error: null
    })
    await expect(isNewAccountSession()).resolves.toBe(false)
  })
})

describe('login', () => {
  test('returns "success" when signInWithPassword succeeds', async () => {
    mocks.signInWithPassword.mockResolvedValueOnce({ data: { session: {} }, error: null })
    await expect(login('e@x.com', 'pw')).resolves.toBe('success')
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({ email: 'e@x.com', password: 'pw' })
  })

  test('returns "invalid-credentials" for invalid_credentials error code', async () => {
    mocks.signInWithPassword.mockResolvedValueOnce({
      data: null,
      error: { code: 'invalid_credentials', message: 'bad', status: 400 }
    })
    await expect(login('e@x.com', 'pw')).resolves.toBe('invalid-credentials')
  })

  test('returns "email-not-confirmed" for email_not_confirmed error code', async () => {
    mocks.signInWithPassword.mockResolvedValueOnce({
      data: null,
      error: { code: 'email_not_confirmed', message: 'confirm', status: 400 }
    })
    await expect(login('e@x.com', 'pw')).resolves.toBe('email-not-confirmed')
  })

  test('returns "rate-limited" when status is 429', async () => {
    mocks.signInWithPassword.mockResolvedValueOnce({
      data: null,
      error: { code: 'over_request_rate_limit', message: 'slow down', status: 429 }
    })
    await expect(login('e@x.com', 'pw')).resolves.toBe('rate-limited')
  })

  test('returns "error" for any other error', async () => {
    mocks.signInWithPassword.mockResolvedValueOnce({
      data: null,
      error: { code: 'server_error', message: 'boom', status: 500 }
    })
    await expect(login('e@x.com', 'pw')).resolves.toBe('error')
  })

  test('returns "error" when signInWithPassword throws', async () => {
    mocks.signInWithPassword.mockRejectedValueOnce(new Error('network failure'))
    await expect(login('e@x.com', 'pw')).resolves.toBe('error')
  })
})

describe('logout', () => {
  test('resolves when signOut succeeds', async () => {
    mocks.signOut.mockResolvedValueOnce({ error: null })
    await expect(logout()).resolves.toBeUndefined()
  })

  test('throws when signOut errors', async () => {
    mocks.signOut.mockResolvedValueOnce({ error: { message: 'offline' } })
    await expect(logout()).rejects.toThrow('offline')
  })
})

describe('signOutLocal', () => {
  test('calls supabase.auth.signOut scoped to local', async () => {
    mocks.signOut.mockResolvedValueOnce({ error: null })
    await signOutLocal()
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  test('swallows the error and logs it rather than throwing', async () => {
    mocks.signOut.mockResolvedValueOnce({ error: { message: 'already gone' } })
    await expect(signOutLocal()).resolves.toBeUndefined()
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('already gone'))
  })
})

describe('signOutOthers', () => {
  test('calls supabase.auth.signOut scoped to "others"', async () => {
    mocks.signOut.mockResolvedValueOnce({ error: null })
    await signOutOthers()
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'others' })
  })

  test('swallows the error and logs it rather than throwing', async () => {
    mocks.signOut.mockResolvedValueOnce({ error: { message: 'no other sessions' } })
    await expect(signOutOthers()).resolves.toBeUndefined()
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('no other sessions'))
  })
})

describe('requestAccountDeletion', () => {
  test('resolves with the deleteAt returned by the edge function', async () => {
    mocks.invoke.mockResolvedValueOnce({ data: { deleteAt: '2026-08-05T00:00:00Z' }, error: null })
    await expect(requestAccountDeletion()).resolves.toBe('2026-08-05T00:00:00Z')
    expect(mocks.invoke).toHaveBeenCalledWith('request-account-deletion', { body: {} })
  })

  test('throws when the edge function returns an error', async () => {
    mocks.invoke.mockResolvedValueOnce({ data: null, error: new Error('boom') })
    await expect(requestAccountDeletion()).rejects.toThrow('boom')
  })

  test('throws when the edge function returns no deleteAt', async () => {
    mocks.invoke.mockResolvedValueOnce({ data: {}, error: null })
    await expect(requestAccountDeletion()).rejects.toThrow()
  })
})

describe('restoreAccount', () => {
  test('calls the restore_account RPC and resolves on success', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: null })
    await expect(restoreAccount()).resolves.toBeUndefined()
    expect(mocks.rpc).toHaveBeenCalledWith('restore_account')
  })

  test('throws when the RPC errors (not pending, or grace period expired)', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: 'Grace period expired' } })
    await expect(restoreAccount()).rejects.toThrow('Grace period expired')
  })
})

describe('signupEmail', () => {
  test('passes display_name through options.data and resolves "success"', async () => {
    const session = { user: { id: 'u1' } }
    mocks.signUp.mockResolvedValueOnce({ data: { session }, error: null })
    await expect(signupEmail('e@x.com', 'pw', { display_name: 'Alice' })).resolves.toBe('success')
    expect(mocks.signUp).toHaveBeenCalledWith({
      email: 'e@x.com',
      password: 'pw',
      options: { data: { display_name: 'Alice' } }
    })
  })

  test('maps the user_already_exists error to "email-taken"', async () => {
    mocks.signUp.mockResolvedValueOnce({
      data: null,
      error: { code: 'user_already_exists', message: 'dup' }
    })
    await expect(signupEmail('e@x.com', 'pw')).resolves.toBe('email-taken')
  })

  test('maps any other supabase error to "error"', async () => {
    mocks.signUp.mockResolvedValueOnce({ data: null, error: { message: 'boom', status: 500 } })
    await expect(signupEmail('e@x.com', 'pw')).resolves.toBe('error')
  })

  test('returns "error" when supabase.auth.signUp throws', async () => {
    mocks.signUp.mockRejectedValueOnce(new Error('network failure'))
    await expect(signupEmail('e@x.com', 'pw')).resolves.toBe('error')
  })
})

describe('isDisplayNameAvailable', () => {
  test('calls the RPC with the trimmed candidate and returns its boolean', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: true, error: null })
    await expect(isDisplayNameAvailable('  Alice  ')).resolves.toBe(true)
    expect(mocks.rpc).toHaveBeenCalledWith('is_display_name_available', { candidate: 'Alice' })
  })

  test('returns false when the name is taken', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: false, error: null })
    await expect(isDisplayNameAvailable('Alice')).resolves.toBe(false)
  })

  test('fails open (returns true) when the RPC errors', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: 'boom' } })
    await expect(isDisplayNameAvailable('Alice')).resolves.toBe(true)
  })
})

describe('signInOAuth', () => {
  let openSpy

  beforeEach(() => {
    openSpy = vi.fn()
    vi.stubGlobal('open', openSpy)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  describe('full-redirect path', () => {
    test('uses the full redirect when pointer is coarse', async () => {
      global.__matchMedia.matches = true
      mocks.signInWithOAuth.mockResolvedValueOnce({ data: null, error: null })

      await signInOAuth('google')

      expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: expect.not.objectContaining({ skipBrowserRedirect: true })
      })
      expect(openSpy).not.toHaveBeenCalled()
    })

    test('uses the full redirect when viewport is narrow', async () => {
      window.innerWidth = 600
      mocks.signInWithOAuth.mockResolvedValueOnce({ data: null, error: null })

      await signInOAuth('google')

      expect(mocks.signInWithOAuth).toHaveBeenCalledTimes(1)
      expect(openSpy).not.toHaveBeenCalled()
    })

    // signInOAuth takes only a provider — the redirectTo is always
    // the registered callback URL, never caller-suppliable. The original bug was
    // signup passing redirectTo:'/dashboard', which overrode the callback URL and
    // skipped the popup self-close path; this also closes an open-redirect hole.
    test('always uses the registered callback redirectTo, never a caller-suppliable route', async () => {
      global.__matchMedia.matches = true
      mocks.signInWithOAuth.mockResolvedValueOnce({ data: null, error: null })

      await signInOAuth('google')

      const [arg] = mocks.signInWithOAuth.mock.calls[0]
      expect(arg.options.redirectTo).toBe('http://localhost:5173/auth/callback')
    })

    test('signInOAuth does not accept a second argument', async () => {
      global.__matchMedia.matches = true
      mocks.signInWithOAuth.mockResolvedValueOnce({ data: null, error: null })

      expect(signInOAuth).toHaveLength(1)
      await signInOAuth('google')
    })

    test('returns "error" (does not throw) when the redirect call errors', async () => {
      global.__matchMedia.matches = true
      mocks.signInWithOAuth.mockResolvedValueOnce({ data: null, error: new Error('boom') })
      await expect(signInOAuth('google')).resolves.toBe('error')
    })

    test('returns "success" when the redirect call succeeds', async () => {
      global.__matchMedia.matches = true
      mocks.signInWithOAuth.mockResolvedValueOnce({ data: null, error: null })
      await expect(signInOAuth('google')).resolves.toBe('success')
    })

    test('clears a stale oauth-popup-pending flag left by an abandoned popup', async () => {
      global.__matchMedia.matches = true
      window.localStorage.setItem('oauth-popup-pending', '1')
      mocks.signInWithOAuth.mockResolvedValueOnce({ data: null, error: null })

      await signInOAuth('google')

      expect(consumeOAuthPopupFlag()).toBe(false)
    })
  })

  describe('popup path', () => {
    function captureAuthCallback() {
      let cb
      const unsubscribe = vi.fn()
      mocks.onAuthStateChange.mockImplementationOnce((fn) => {
        cb = fn
        return { data: { subscription: { unsubscribe } } }
      })
      return { get: () => cb, unsubscribe }
    }

    test('sets the oauth-popup-pending flag when a genuine popup opens', async () => {
      mocks.signInWithOAuth.mockResolvedValueOnce({
        data: { url: 'https://auth.x/login' },
        error: null
      })
      const popup = { closed: false }
      openSpy.mockReturnValue(popup)
      captureAuthCallback()

      signInOAuth('google')
      await Promise.resolve()

      expect(consumeOAuthPopupFlag()).toBe(true)
      expect(consumeOAuthPopupFlag()).toBe(false)
    })

    test('does not set the oauth-popup-pending flag when window.open is blocked', async () => {
      mocks.signInWithOAuth.mockResolvedValueOnce({
        data: { url: 'https://auth.x' },
        error: null
      })
      openSpy.mockReturnValue(null)
      const locationStub = { href: '' }
      vi.stubGlobal('location', locationStub)

      await signInOAuth('google')

      expect(consumeOAuthPopupFlag()).toBe(false)
    })

    test('passes skipBrowserRedirect=true and opens the popup', async () => {
      mocks.signInWithOAuth.mockResolvedValueOnce({
        data: { url: 'https://auth.x/login' },
        error: null
      })
      const popup = { closed: false }
      openSpy.mockReturnValue(popup)
      captureAuthCallback()

      signInOAuth('google')
      await Promise.resolve()

      expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: expect.objectContaining({ skipBrowserRedirect: true })
      })
      expect(openSpy).toHaveBeenCalledWith(
        'https://auth.x/login',
        'oauthFlow',
        expect.stringContaining('width=500')
      )
    })

    test('resolves when onAuthStateChange fires SIGNED_IN with a session', async () => {
      mocks.signInWithOAuth.mockResolvedValueOnce({
        data: { url: 'https://auth.x' },
        error: null
      })
      openSpy.mockReturnValue({ closed: false })
      const cb = captureAuthCallback()

      const promise = signInOAuth('google')
      await Promise.resolve()

      cb.get()('SIGNED_IN', { user: { id: 'u1' } })

      await expect(promise).resolves.toBe('success')
      expect(cb.unsubscribe).toHaveBeenCalled()
    })

    test('ignores onAuthStateChange events that are not SIGNED_IN', async () => {
      mocks.signInWithOAuth.mockResolvedValueOnce({
        data: { url: 'https://auth.x' },
        error: null
      })
      openSpy.mockReturnValue({ closed: false })
      const cb = captureAuthCallback()

      const promise = signInOAuth('google')
      await Promise.resolve()

      cb.get()('TOKEN_REFRESHED', { user: { id: 'u1' } })
      cb.get()('SIGNED_OUT', null)

      let settled = false
      promise.then(() => (settled = true))
      await Promise.resolve()
      expect(settled).toBe(false)

      cb.get()('SIGNED_IN', { user: { id: 'u1' } })
      await expect(promise).resolves.toBe('success')
    })

    test('ignores SIGNED_IN when the session is null', async () => {
      mocks.signInWithOAuth.mockResolvedValueOnce({
        data: { url: 'https://auth.x' },
        error: null
      })
      openSpy.mockReturnValue({ closed: false })
      const cb = captureAuthCallback()

      const promise = signInOAuth('google')
      await Promise.resolve()

      cb.get()('SIGNED_IN', null)

      let settled = false
      promise.then(() => (settled = true))
      await Promise.resolve()
      expect(settled).toBe(false)

      cb.get()('SIGNED_IN', { user: { id: 'u1' } })
      await expect(promise).resolves.toBe('success')
    })

    // signInOAuth never throws — the timeout is caught internally
    // and mapped to the 'error' outcome so callers can't misread a void promise.
    test('resolves "error" (does not throw) after the 5-minute timeout', async () => {
      vi.useFakeTimers()
      mocks.signInWithOAuth.mockResolvedValueOnce({
        data: { url: 'https://auth.x' },
        error: null
      })
      openSpy.mockReturnValue({ closed: false })
      const cb = captureAuthCallback()

      const promise = signInOAuth('google')
      await Promise.resolve()

      await vi.advanceTimersByTimeAsync(5 * 60 * 1000)

      await expect(promise).resolves.toBe('error')
      expect(cb.unsubscribe).toHaveBeenCalled()
    })

    test('falls back to full-tab redirect when window.open is blocked (null)', async () => {
      mocks.signInWithOAuth.mockResolvedValueOnce({
        data: { url: 'https://auth.x' },
        error: null
      })
      openSpy.mockReturnValue(null)
      const locationStub = { href: '' }
      vi.stubGlobal('location', locationStub)

      await signInOAuth('google')

      expect(locationStub.href).toBe('https://auth.x')
      expect(mocks.onAuthStateChange).not.toHaveBeenCalled()
    })

    test('falls back to full-tab redirect when popup is immediately closed', async () => {
      mocks.signInWithOAuth.mockResolvedValueOnce({
        data: { url: 'https://auth.x' },
        error: null
      })
      openSpy.mockReturnValue({ closed: true })
      const locationStub = { href: '' }
      vi.stubGlobal('location', locationStub)

      await signInOAuth('google')

      expect(locationStub.href).toBe('https://auth.x')
    })

    test('resolves "error" (does not throw) when signInWithOAuth returns an error', async () => {
      mocks.signInWithOAuth.mockResolvedValueOnce({ data: null, error: new Error('oauth fail') })
      await expect(signInOAuth('google')).resolves.toBe('error')
    })

    test('resolves "error" (does not throw) when signInWithOAuth returns no url', async () => {
      mocks.signInWithOAuth.mockResolvedValueOnce({ data: {}, error: null })
      await expect(signInOAuth('google')).resolves.toBe('error')
    })
  })
})

describe('linkGoogleIdentity', () => {
  let openSpy

  beforeEach(() => {
    openSpy = vi.fn()
    vi.stubGlobal('open', openSpy)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  test('passes options through to linkIdentity and opens the shared oauthFlow popup', async () => {
    mocks.linkIdentity.mockResolvedValueOnce({ data: { url: 'https://auth.x/link' }, error: null })
    mocks.refreshSession.mockResolvedValueOnce({ error: null })
    const popup = { closed: false }
    openSpy.mockReturnValue(popup)

    const promise = linkGoogleIdentity()
    await Promise.resolve()
    popup.closed = true
    await promise

    expect(mocks.linkIdentity).toHaveBeenCalledWith({
      provider: 'google',
      options: expect.objectContaining({ skipBrowserRedirect: true })
    })
    expect(openSpy).toHaveBeenCalledWith(
      'https://auth.x/link',
      'oauthFlow',
      expect.stringContaining('width=500')
    )
  })

  test('resolves via popup.closed polling, not onAuthStateChange', async () => {
    mocks.linkIdentity.mockResolvedValueOnce({ data: { url: 'https://auth.x/link' }, error: null })
    mocks.refreshSession.mockResolvedValueOnce({ error: null })
    const popup = { closed: false }
    openSpy.mockReturnValue(popup)

    const promise = linkGoogleIdentity()
    await Promise.resolve()

    let settled = false
    promise.then(() => (settled = true))
    await Promise.resolve()
    expect(settled).toBe(false)
    expect(mocks.onAuthStateChange).not.toHaveBeenCalled()

    popup.closed = true
    await promise

    expect(settled).toBe(true)
  })

  test('calls refreshSession after the popup closes, before resolving', async () => {
    mocks.linkIdentity.mockResolvedValueOnce({ data: { url: 'https://auth.x/link' }, error: null })
    mocks.refreshSession.mockResolvedValueOnce({ error: null })
    const popup = { closed: false }
    openSpy.mockReturnValue(popup)

    const promise = linkGoogleIdentity()
    await Promise.resolve()
    expect(mocks.refreshSession).not.toHaveBeenCalled()

    popup.closed = true
    await promise

    expect(mocks.refreshSession).toHaveBeenCalledOnce()
  })

  test('throws when refreshSession errors after the popup closes', async () => {
    mocks.linkIdentity.mockResolvedValueOnce({ data: { url: 'https://auth.x/link' }, error: null })
    mocks.refreshSession.mockResolvedValueOnce({ error: { message: 'stale' } })
    const popup = { closed: false }
    openSpy.mockReturnValue(popup)

    const promise = linkGoogleIdentity()
    await Promise.resolve()
    popup.closed = true

    await expect(promise).rejects.toThrow('stale')
  })

  test('throws when linkIdentity returns an error', async () => {
    mocks.linkIdentity.mockResolvedValueOnce({ data: null, error: new Error('link failed') })
    await expect(linkGoogleIdentity()).rejects.toThrow('link failed')
  })
})

describe('unlinkGoogleIdentity', () => {
  test('unlinks the identity with provider "google"', async () => {
    const googleIdentity = { provider: 'google', identity_id: 'g1' }
    mocks.getUserIdentities.mockResolvedValueOnce({
      data: { identities: [{ provider: 'email' }, googleIdentity] },
      error: null
    })
    mocks.unlinkIdentity.mockResolvedValueOnce({ error: null })

    await unlinkGoogleIdentity()

    expect(mocks.unlinkIdentity).toHaveBeenCalledWith(googleIdentity)
  })

  test('is a no-op when no google identity is present', async () => {
    mocks.getUserIdentities.mockResolvedValueOnce({
      data: { identities: [{ provider: 'email' }] },
      error: null
    })

    await unlinkGoogleIdentity()

    expect(mocks.unlinkIdentity).not.toHaveBeenCalled()
  })

  test('throws when getUserIdentities errors', async () => {
    mocks.getUserIdentities.mockResolvedValueOnce({ data: null, error: { message: 'boom' } })
    await expect(unlinkGoogleIdentity()).rejects.toThrow('boom')
  })

  test('throws when unlinkIdentity errors', async () => {
    mocks.getUserIdentities.mockResolvedValueOnce({
      data: { identities: [{ provider: 'google' }] },
      error: null
    })
    mocks.unlinkIdentity.mockResolvedValueOnce({
      error: { message: 'cannot unlink last identity' }
    })

    await expect(unlinkGoogleIdentity()).rejects.toThrow('cannot unlink last identity')
  })
})

describe('updateEmail', () => {
  test('returns "success" when updateUser succeeds', async () => {
    mocks.updateUser.mockResolvedValueOnce({ error: null })
    await expect(updateEmail('new@x.com')).resolves.toBe('success')
    expect(mocks.updateUser).toHaveBeenCalledWith({ email: 'new@x.com' })
  })

  test('maps the email_exists error to "email-taken"', async () => {
    mocks.updateUser.mockResolvedValueOnce({ error: { code: 'email_exists', message: 'taken' } })
    await expect(updateEmail('new@x.com')).resolves.toBe('email-taken')
  })

  test('maps any other error to "error"', async () => {
    mocks.updateUser.mockResolvedValueOnce({ error: { code: 'server_error', message: 'boom' } })
    await expect(updateEmail('new@x.com')).resolves.toBe('error')
  })

  test('returns "error" when updateUser throws', async () => {
    mocks.updateUser.mockRejectedValueOnce(new Error('network failure'))
    await expect(updateEmail('new@x.com')).resolves.toBe('error')
  })
})

describe('updatePassword', () => {
  test('returns "success" when updateUser succeeds', async () => {
    mocks.updateUser.mockResolvedValueOnce({ error: null })
    mocks.signOut.mockResolvedValueOnce({ error: null })
    await expect(updatePassword('hunter22')).resolves.toBe('success')
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: 'hunter22' })
  })

  test('maps the weak_password error to "weak-password"', async () => {
    mocks.updateUser.mockResolvedValueOnce({ error: { code: 'weak_password', message: 'weak' } })
    await expect(updatePassword('weak')).resolves.toBe('weak-password')
  })

  test('maps the same_password error to "same-password"', async () => {
    mocks.updateUser.mockResolvedValueOnce({
      error: {
        code: 'same_password',
        message: 'New password should be different from the old password.'
      }
    })
    await expect(updatePassword('hunter22')).resolves.toBe('same-password')
  })

  test('maps any other error to "error"', async () => {
    mocks.updateUser.mockResolvedValueOnce({ error: { code: 'server_error', message: 'boom' } })
    await expect(updatePassword('hunter22')).resolves.toBe('error')
  })

  test('returns "error" when updateUser throws', async () => {
    mocks.updateUser.mockRejectedValueOnce(new Error('network failure'))
    await expect(updatePassword('hunter22')).resolves.toBe('error')
  })

  // updatePassword calls signOutOthers() ONLY on a successful
  // updateUser — asserted not-called on every other outcome.
  test('calls signOutOthers (scope: "others") on success, after updateUser succeeds', async () => {
    mocks.updateUser.mockResolvedValueOnce({ error: null })
    mocks.signOut.mockResolvedValueOnce({ error: null })

    await updatePassword('hunter22')

    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'others' })
  })

  test('does NOT call signOutOthers on "weak-password"', async () => {
    mocks.updateUser.mockResolvedValueOnce({ error: { code: 'weak_password', message: 'weak' } })
    await updatePassword('weak')
    expect(mocks.signOut).not.toHaveBeenCalled()
  })

  test('does NOT call signOutOthers on "same-password"', async () => {
    mocks.updateUser.mockResolvedValueOnce({ error: { code: 'same_password', message: 'same' } })
    await updatePassword('hunter22')
    expect(mocks.signOut).not.toHaveBeenCalled()
  })

  test('does NOT call signOutOthers on any other error outcome', async () => {
    mocks.updateUser.mockResolvedValueOnce({ error: { code: 'server_error', message: 'boom' } })
    await updatePassword('hunter22')
    expect(mocks.signOut).not.toHaveBeenCalled()
  })

  test('does NOT call signOutOthers when updateUser throws', async () => {
    mocks.updateUser.mockRejectedValueOnce(new Error('network failure'))
    await updatePassword('hunter22')
    expect(mocks.signOut).not.toHaveBeenCalled()
  })

  // a failing signOutOthers() must NOT downgrade a successful
  // password change — outcome stays 'success', error logged and swallowed.
  test('a failing signOutOthers does not downgrade the "success" outcome; error is logged and swallowed', async () => {
    mocks.updateUser.mockResolvedValueOnce({ error: null })
    mocks.signOut.mockResolvedValueOnce({ error: { message: 'revoke failed' } })

    await expect(updatePassword('hunter22')).resolves.toBe('success')

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('revoke failed'))
  })

  // regression guard — updatePassword must never send a nonce.
  // Verified against local GoTrue: a deliberately wrong nonce still changes
  // the password when secure_password_change is off, so the nonce gates
  // nothing. Identity is verified before this call, never via GoTrue's nonce.
  test('never sends a nonce — updateUser is called with only { password }', async () => {
    mocks.updateUser.mockResolvedValueOnce({ error: null })
    mocks.signOut.mockResolvedValueOnce({ error: null })

    await updatePassword('hunter22')

    const [arg] = mocks.updateUser.mock.calls[0]
    expect(arg).toEqual({ password: 'hunter22' })
    expect(arg).not.toHaveProperty('nonce')
  })
})

describe('fetchHasPassword', () => {
  test('returns true when the RPC resolves true', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: true, error: null })
    await expect(fetchHasPassword()).resolves.toBe(true)
    expect(mocks.rpc).toHaveBeenCalledWith('member_has_password')
  })

  test('returns false when the RPC resolves false', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: false, error: null })
    await expect(fetchHasPassword()).resolves.toBe(false)
  })

  // falls back to false on error — false routes to the emailed-code
  // proof, which is still a real re-proof; true would wrongly offer a
  // current-password field to someone with no password.
  test('falls back to false when the RPC errors', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: 'boom' } })
    await expect(fetchHasPassword()).resolves.toBe(false)
  })

  test('falls back to false when the RPC call throws', async () => {
    mocks.rpc.mockRejectedValueOnce(new Error('network failure'))
    await expect(fetchHasPassword()).resolves.toBe(false)
  })
})

describe('verifyPassword', () => {
  test('signs in again with the session email and the given password, returning "success"', async () => {
    mocks.getSession.mockResolvedValueOnce({
      data: { session: { user: { email: 'e@x.com' } } },
      error: null
    })
    mocks.signInWithPassword.mockResolvedValueOnce({ error: null })

    await expect(verifyPassword('hunter22')).resolves.toBe('success')

    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'e@x.com',
      password: 'hunter22'
    })
  })

  test('maps invalid_credentials to "invalid-credentials"', async () => {
    mocks.getSession.mockResolvedValueOnce({
      data: { session: { user: { email: 'e@x.com' } } },
      error: null
    })
    mocks.signInWithPassword.mockResolvedValueOnce({
      error: { code: 'invalid_credentials', message: 'bad' }
    })

    await expect(verifyPassword('wrong')).resolves.toBe('invalid-credentials')
  })

  test('maps any other error to "error"', async () => {
    mocks.getSession.mockResolvedValueOnce({
      data: { session: { user: { email: 'e@x.com' } } },
      error: null
    })
    mocks.signInWithPassword.mockResolvedValueOnce({
      error: { code: 'server_error', message: 'boom' }
    })

    await expect(verifyPassword('hunter22')).resolves.toBe('error')
  })

  test('returns "error" when the sign-in call throws', async () => {
    mocks.getSession.mockResolvedValueOnce({
      data: { session: { user: { email: 'e@x.com' } } },
      error: null
    })
    mocks.signInWithPassword.mockRejectedValueOnce(new Error('network failure'))

    await expect(verifyPassword('hunter22')).resolves.toBe('error')
  })

  // the same-account guard: the email is read off the live session,
  // never accepted as an argument. No email on the session → 'error' WITHOUT
  // calling signInWithPassword — a caller can't hand in a different address and
  // have a sign-in to someone else's account read as proof.
  test('no email on the session → returns "error" WITHOUT calling signInWithPassword', async () => {
    mocks.getSession.mockResolvedValueOnce({ data: { session: null }, error: null })

    await expect(verifyPassword('hunter22')).resolves.toBe('error')

    expect(mocks.signInWithPassword).not.toHaveBeenCalled()
  })

  test('verifyPassword does not accept an email argument — only takes the password', () => {
    expect(verifyPassword).toHaveLength(1)
  })
})

describe('requestReauthCode', () => {
  test('emails an OTP to the session email and returns "success"', async () => {
    mocks.getSession.mockResolvedValueOnce({
      data: { session: { user: { email: 'e@x.com' } } },
      error: null
    })
    mocks.signInWithOtp.mockResolvedValueOnce({ error: null })

    await expect(requestReauthCode()).resolves.toBe('success')

    expect(mocks.signInWithOtp).toHaveBeenCalledWith({
      email: 'e@x.com',
      options: { shouldCreateUser: false }
    })
  })

  // shouldCreateUser: false — a stray address must not quietly mint
  // a new account.
  test('always passes shouldCreateUser: false', async () => {
    mocks.getSession.mockResolvedValueOnce({
      data: { session: { user: { email: 'e@x.com' } } },
      error: null
    })
    mocks.signInWithOtp.mockResolvedValueOnce({ error: null })

    await requestReauthCode()

    const [arg] = mocks.signInWithOtp.mock.calls[0]
    expect(arg.options).toEqual({ shouldCreateUser: false })
  })

  test('maps a 429 status to "rate-limited"', async () => {
    mocks.getSession.mockResolvedValueOnce({
      data: { session: { user: { email: 'e@x.com' } } },
      error: null
    })
    mocks.signInWithOtp.mockResolvedValueOnce({ error: { status: 429, message: 'slow down' } })

    await expect(requestReauthCode()).resolves.toBe('rate-limited')
  })

  test('maps any other error to "error"', async () => {
    mocks.getSession.mockResolvedValueOnce({
      data: { session: { user: { email: 'e@x.com' } } },
      error: null
    })
    mocks.signInWithOtp.mockResolvedValueOnce({ error: { status: 500, message: 'boom' } })

    await expect(requestReauthCode()).resolves.toBe('error')
  })

  test('returns "error" when the call throws', async () => {
    mocks.getSession.mockResolvedValueOnce({
      data: { session: { user: { email: 'e@x.com' } } },
      error: null
    })
    mocks.signInWithOtp.mockRejectedValueOnce(new Error('network failure'))

    await expect(requestReauthCode()).resolves.toBe('error')
  })

  // same session-email guard as verifyPassword.
  test('no email on the session → returns "error" WITHOUT calling signInWithOtp', async () => {
    mocks.getSession.mockResolvedValueOnce({ data: { session: null }, error: null })

    await expect(requestReauthCode()).resolves.toBe('error')

    expect(mocks.signInWithOtp).not.toHaveBeenCalled()
  })
})

describe('verifyReauthCode', () => {
  test('signs in with the emailed code against the session email, returning "success"', async () => {
    mocks.getSession.mockResolvedValueOnce({
      data: { session: { user: { email: 'e@x.com' } } },
      error: null
    })
    mocks.verifyOtp.mockResolvedValueOnce({ error: null })

    await expect(verifyReauthCode('123456')).resolves.toBe('success')

    expect(mocks.verifyOtp).toHaveBeenCalledWith({
      email: 'e@x.com',
      token: '123456',
      type: 'email'
    })
  })

  // GoTrue answers a wrong code and an expired one identically —
  // both collapse into 'invalid-code'.
  test('maps otp_expired to "invalid-code" (wrong and expired codes are indistinguishable)', async () => {
    mocks.getSession.mockResolvedValueOnce({
      data: { session: { user: { email: 'e@x.com' } } },
      error: null
    })
    mocks.verifyOtp.mockResolvedValueOnce({ error: { code: 'otp_expired', message: 'expired' } })

    await expect(verifyReauthCode('000000')).resolves.toBe('invalid-code')
  })

  test('maps any other error to "error"', async () => {
    mocks.getSession.mockResolvedValueOnce({
      data: { session: { user: { email: 'e@x.com' } } },
      error: null
    })
    mocks.verifyOtp.mockResolvedValueOnce({ error: { code: 'server_error', message: 'boom' } })

    await expect(verifyReauthCode('123456')).resolves.toBe('error')
  })

  test('returns "error" when the call throws', async () => {
    mocks.getSession.mockResolvedValueOnce({
      data: { session: { user: { email: 'e@x.com' } } },
      error: null
    })
    mocks.verifyOtp.mockRejectedValueOnce(new Error('network failure'))

    await expect(verifyReauthCode('123456')).resolves.toBe('error')
  })

  // same session-email guard as verifyPassword/requestReauthCode.
  test('no email on the session → returns "error" WITHOUT calling verifyOtp', async () => {
    mocks.getSession.mockResolvedValueOnce({ data: { session: null }, error: null })

    await expect(verifyReauthCode('123456')).resolves.toBe('error')

    expect(mocks.verifyOtp).not.toHaveBeenCalled()
  })
})

describe('isPasswordRecoveryUrl', () => {
  afterEach(() => {
    window.location.hash = ''
  })

  test('returns true when the hash contains type=recovery', () => {
    window.location.hash = '#access_token=abc&type=recovery'
    expect(isPasswordRecoveryUrl()).toBe(true)
  })

  test('returns true when the ?type=recovery query param is present', () => {
    vi.stubGlobal('location', { hash: '', search: '?type=recovery' })
    expect(isPasswordRecoveryUrl()).toBe(true)
    vi.unstubAllGlobals()
  })

  test('returns false for a normal page load with no hash/query', () => {
    vi.stubGlobal('location', { hash: '', search: '' })
    expect(isPasswordRecoveryUrl()).toBe(false)
    vi.unstubAllGlobals()
  })
})

describe('waitForPasswordRecovery', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  function captureAuthCallback() {
    let cb
    const unsubscribe = vi.fn()
    mocks.onAuthStateChange.mockImplementationOnce((fn) => {
      cb = fn
      return { data: { subscription: { unsubscribe } } }
    })
    return { get: () => cb, unsubscribe }
  }

  test('resolves true when PASSWORD_RECOVERY fires', async () => {
    const cb = captureAuthCallback()
    const promise = waitForPasswordRecovery()

    cb.get()('PASSWORD_RECOVERY')

    await expect(promise).resolves.toBe(true)
  })

  test('unsubscribes and clears the timeout when the event fires', async () => {
    vi.useFakeTimers()
    const clearSpy = vi.spyOn(window, 'clearTimeout')
    const cb = captureAuthCallback()
    const promise = waitForPasswordRecovery()

    cb.get()('PASSWORD_RECOVERY')
    await promise

    expect(cb.unsubscribe).toHaveBeenCalledOnce()
    expect(clearSpy).toHaveBeenCalled()
  })

  test('ignores auth events that are not PASSWORD_RECOVERY', async () => {
    const cb = captureAuthCallback()
    const promise = waitForPasswordRecovery()

    cb.get()('SIGNED_IN')

    let settled = false
    promise.then(() => (settled = true))
    await Promise.resolve()
    expect(settled).toBe(false)

    cb.get()('PASSWORD_RECOVERY')
    await expect(promise).resolves.toBe(true)
  })

  test('resolves false after an 8s timeout when the event never fires', async () => {
    vi.useFakeTimers()
    const cb = captureAuthCallback()
    const promise = waitForPasswordRecovery()

    vi.advanceTimersByTime(8000)

    await expect(promise).resolves.toBe(false)
    expect(cb.unsubscribe).toHaveBeenCalledOnce()
  })

  test('does not resolve before the 8s timeout elapses', async () => {
    vi.useFakeTimers()
    captureAuthCallback()
    const promise = waitForPasswordRecovery()

    vi.advanceTimersByTime(7999)

    let settled = false
    promise.then(() => (settled = true))
    await Promise.resolve()
    expect(settled).toBe(false)
  })
})

describe('isAuthError', () => {
  test('returns true for a 401 status error', () => {
    expect(isAuthError({ status: 401 })).toBe(true)
  })

  test('returns true for a PGRST301 code error', () => {
    expect(isAuthError({ code: 'PGRST301' })).toBe(true)
  })

  test('returns true for an AuthApiError name', () => {
    expect(isAuthError({ name: 'AuthApiError' })).toBe(true)
  })

  test('returns false for an unrelated error shape', () => {
    expect(isAuthError({ status: 500, code: 'server_error', message: 'boom' })).toBe(false)
  })

  test('returns false for null', () => {
    expect(isAuthError(null)).toBe(false)
  })

  test('returns false for undefined', () => {
    expect(isAuthError(undefined)).toBe(false)
  })

  test('returns false for a plain non-auth error', () => {
    expect(isAuthError(new Error('generic failure'))).toBe(false)
  })
})

describe('onSignedOut', () => {
  function captureAuthCallback() {
    let cb
    const unsubscribe = vi.fn()
    mocks.onAuthStateChange.mockImplementationOnce((fn) => {
      cb = fn
      return { data: { subscription: { unsubscribe } } }
    })
    return { get: () => cb, unsubscribe }
  }

  test('invokes the callback when SIGNED_OUT fires', () => {
    const cb = captureAuthCallback()
    const callback = vi.fn()
    onSignedOut(callback)

    cb.get()('SIGNED_OUT')

    expect(callback).toHaveBeenCalledOnce()
  })

  test('does not invoke the callback for SIGNED_IN', () => {
    const cb = captureAuthCallback()
    const callback = vi.fn()
    onSignedOut(callback)

    cb.get()('SIGNED_IN')

    expect(callback).not.toHaveBeenCalled()
  })

  test('does not invoke the callback for TOKEN_REFRESHED', () => {
    const cb = captureAuthCallback()
    const callback = vi.fn()
    onSignedOut(callback)

    cb.get()('TOKEN_REFRESHED')

    expect(callback).not.toHaveBeenCalled()
  })

  test('returned unsubscribe function unsubscribes from the auth listener', () => {
    const cb = captureAuthCallback()
    const unsubscribeFn = onSignedOut(vi.fn())

    unsubscribeFn()

    expect(cb.unsubscribe).toHaveBeenCalledOnce()
  })
})

describe('consumeOAuthPopupFlag', () => {
  afterEach(() => {
    window.localStorage.removeItem('oauth-popup-pending')
  })

  test('returns true when the flag is exactly "1"', () => {
    window.localStorage.setItem('oauth-popup-pending', '1')
    expect(consumeOAuthPopupFlag()).toBe(true)
  })

  test('returns false when the flag is absent', () => {
    expect(consumeOAuthPopupFlag()).toBe(false)
  })

  test('returns false for any non-"1" value', () => {
    window.localStorage.setItem('oauth-popup-pending', 'true')
    expect(consumeOAuthPopupFlag()).toBe(false)
  })

  test('clears the flag as a side effect, so a second call returns false', () => {
    window.localStorage.setItem('oauth-popup-pending', '1')
    expect(consumeOAuthPopupFlag()).toBe(true)
    expect(consumeOAuthPopupFlag()).toBe(false)
  })
})

describe('requestPasswordReset', () => {
  test('returns "success" and calls resetPasswordForEmail with the email and a redirect URL', async () => {
    mocks.resetPasswordForEmail.mockResolvedValueOnce({ error: null })

    await expect(requestPasswordReset('e@x.com')).resolves.toBe('success')

    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith('e@x.com', {
      redirectTo: expect.any(String)
    })
  })

  test('returns "error" when supabase returns an error — no account-existence-specific outcome', async () => {
    mocks.resetPasswordForEmail.mockResolvedValueOnce({
      error: { message: 'rate limited' }
    })

    await expect(requestPasswordReset('e@x.com')).resolves.toBe('error')
  })

  test('returns "error" when resetPasswordForEmail throws', async () => {
    mocks.resetPasswordForEmail.mockRejectedValueOnce(new Error('network failure'))
    await expect(requestPasswordReset('e@x.com')).resolves.toBe('error')
  })
})
