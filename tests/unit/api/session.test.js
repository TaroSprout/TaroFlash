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
  resetPasswordForEmail: vi.fn()
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
      resetPasswordForEmail: mocks.resetPasswordForEmail
    }
  }
}))

import {
  getSession,
  getUser,
  login,
  logout,
  signupEmail,
  signInOAuth,
  linkGoogleIdentity,
  unlinkGoogleIdentity,
  updateEmail,
  updatePassword,
  isPasswordRecoveryUrl,
  waitForPasswordRecovery,
  requestPasswordReset,
  isAuthError,
  onSignedOut
} from '@/api/session'

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

describe('login', () => {
  test('returns "success" when signInWithPassword succeeds [obligation]', async () => {
    mocks.signInWithPassword.mockResolvedValueOnce({ data: { session: {} }, error: null })
    await expect(login('e@x.com', 'pw')).resolves.toBe('success')
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({ email: 'e@x.com', password: 'pw' })
  })

  test('returns "invalid-credentials" for invalid_credentials error code [obligation]', async () => {
    mocks.signInWithPassword.mockResolvedValueOnce({
      data: null,
      error: { code: 'invalid_credentials', message: 'bad', status: 400 }
    })
    await expect(login('e@x.com', 'pw')).resolves.toBe('invalid-credentials')
  })

  test('returns "email-not-confirmed" for email_not_confirmed error code [obligation]', async () => {
    mocks.signInWithPassword.mockResolvedValueOnce({
      data: null,
      error: { code: 'email_not_confirmed', message: 'confirm', status: 400 }
    })
    await expect(login('e@x.com', 'pw')).resolves.toBe('email-not-confirmed')
  })

  test('returns "rate-limited" when status is 429 [obligation]', async () => {
    mocks.signInWithPassword.mockResolvedValueOnce({
      data: null,
      error: { code: 'over_request_rate_limit', message: 'slow down', status: 429 }
    })
    await expect(login('e@x.com', 'pw')).resolves.toBe('rate-limited')
  })

  test('returns "error" for any other error [obligation]', async () => {
    mocks.signInWithPassword.mockResolvedValueOnce({
      data: null,
      error: { code: 'server_error', message: 'boom', status: 500 }
    })
    await expect(login('e@x.com', 'pw')).resolves.toBe('error')
  })

  test('returns "error" when signInWithPassword throws [obligation]', async () => {
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

  test('returns "error" when supabase.auth.signUp throws [obligation]', async () => {
    mocks.signUp.mockRejectedValueOnce(new Error('network failure'))
    await expect(signupEmail('e@x.com', 'pw')).resolves.toBe('error')
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

    test('merges caller-provided options over defaults', async () => {
      global.__matchMedia.matches = true
      mocks.signInWithOAuth.mockResolvedValueOnce({ data: null, error: null })

      await signInOAuth('google', { redirectTo: '/custom' })

      const [arg] = mocks.signInWithOAuth.mock.calls[0]
      expect(arg.options.redirectTo).toBe('/custom')
    })

    test('throws when the redirect call errors', async () => {
      global.__matchMedia.matches = true
      mocks.signInWithOAuth.mockResolvedValueOnce({ data: null, error: new Error('boom') })
      await expect(signInOAuth('google')).rejects.toThrow('boom')
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

      await expect(promise).resolves.toBeUndefined()
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
      await expect(promise).resolves.toBeUndefined()
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
      await expect(promise).resolves.toBeUndefined()
    })

    test('rejects after the 5-minute timeout', async () => {
      vi.useFakeTimers()
      mocks.signInWithOAuth.mockResolvedValueOnce({
        data: { url: 'https://auth.x' },
        error: null
      })
      openSpy.mockReturnValue({ closed: false })
      const cb = captureAuthCallback()

      const promise = signInOAuth('google')
      promise.catch(() => {})
      await Promise.resolve()

      vi.advanceTimersByTime(5 * 60 * 1000)

      await expect(promise).rejects.toThrow('OAuth timed out')
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

    test('throws when signInWithOAuth returns an error', async () => {
      mocks.signInWithOAuth.mockResolvedValueOnce({ data: null, error: new Error('oauth fail') })
      await expect(signInOAuth('google')).rejects.toThrow('oauth fail')
    })

    test('throws when signInWithOAuth returns no url', async () => {
      mocks.signInWithOAuth.mockResolvedValueOnce({ data: {}, error: null })
      await expect(signInOAuth('google')).rejects.toThrow('No URL returned')
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

  test('[obligation] resolves via popup.closed polling, not onAuthStateChange', async () => {
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

  test('[obligation] calls refreshSession after the popup closes, before resolving', async () => {
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
})

describe('isPasswordRecoveryUrl [obligation]', () => {
  afterEach(() => {
    window.location.hash = ''
  })

  test('returns true when the hash contains type=recovery [obligation]', () => {
    window.location.hash = '#access_token=abc&type=recovery'
    expect(isPasswordRecoveryUrl()).toBe(true)
  })

  test('returns true when the ?type=recovery query param is present [obligation]', () => {
    vi.stubGlobal('location', { hash: '', search: '?type=recovery' })
    expect(isPasswordRecoveryUrl()).toBe(true)
    vi.unstubAllGlobals()
  })

  test('returns false for a normal page load with no hash/query [obligation]', () => {
    vi.stubGlobal('location', { hash: '', search: '' })
    expect(isPasswordRecoveryUrl()).toBe(false)
    vi.unstubAllGlobals()
  })
})

describe('waitForPasswordRecovery [obligation]', () => {
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

  test('resolves true when PASSWORD_RECOVERY fires [obligation]', async () => {
    const cb = captureAuthCallback()
    const promise = waitForPasswordRecovery()

    cb.get()('PASSWORD_RECOVERY')

    await expect(promise).resolves.toBe(true)
  })

  test('unsubscribes and clears the timeout when the event fires [obligation]', async () => {
    vi.useFakeTimers()
    const clearSpy = vi.spyOn(window, 'clearTimeout')
    const cb = captureAuthCallback()
    const promise = waitForPasswordRecovery()

    cb.get()('PASSWORD_RECOVERY')
    await promise

    expect(cb.unsubscribe).toHaveBeenCalledOnce()
    expect(clearSpy).toHaveBeenCalled()
  })

  test('ignores auth events that are not PASSWORD_RECOVERY [obligation]', async () => {
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

  test('resolves false after an 8s timeout when the event never fires [obligation]', async () => {
    vi.useFakeTimers()
    const cb = captureAuthCallback()
    const promise = waitForPasswordRecovery()

    vi.advanceTimersByTime(8000)

    await expect(promise).resolves.toBe(false)
    expect(cb.unsubscribe).toHaveBeenCalledOnce()
  })

  test('does not resolve before the 8s timeout elapses [obligation]', async () => {
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

describe('isAuthError [obligation]', () => {
  test('returns true for a 401 status error [obligation]', () => {
    expect(isAuthError({ status: 401 })).toBe(true)
  })

  test('returns true for a PGRST301 code error [obligation]', () => {
    expect(isAuthError({ code: 'PGRST301' })).toBe(true)
  })

  test('returns true for an AuthApiError name [obligation]', () => {
    expect(isAuthError({ name: 'AuthApiError' })).toBe(true)
  })

  test('returns false for an unrelated error shape [obligation]', () => {
    expect(isAuthError({ status: 500, code: 'server_error', message: 'boom' })).toBe(false)
  })

  test('returns false for null [obligation]', () => {
    expect(isAuthError(null)).toBe(false)
  })

  test('returns false for undefined [obligation]', () => {
    expect(isAuthError(undefined)).toBe(false)
  })

  test('returns false for a plain non-auth error [obligation]', () => {
    expect(isAuthError(new Error('generic failure'))).toBe(false)
  })
})

describe('onSignedOut [obligation]', () => {
  function captureAuthCallback() {
    let cb
    const unsubscribe = vi.fn()
    mocks.onAuthStateChange.mockImplementationOnce((fn) => {
      cb = fn
      return { data: { subscription: { unsubscribe } } }
    })
    return { get: () => cb, unsubscribe }
  }

  test('invokes the callback when SIGNED_OUT fires [obligation]', () => {
    const cb = captureAuthCallback()
    const callback = vi.fn()
    onSignedOut(callback)

    cb.get()('SIGNED_OUT')

    expect(callback).toHaveBeenCalledOnce()
  })

  test('does not invoke the callback for SIGNED_IN [obligation]', () => {
    const cb = captureAuthCallback()
    const callback = vi.fn()
    onSignedOut(callback)

    cb.get()('SIGNED_IN')

    expect(callback).not.toHaveBeenCalled()
  })

  test('does not invoke the callback for TOKEN_REFRESHED [obligation]', () => {
    const cb = captureAuthCallback()
    const callback = vi.fn()
    onSignedOut(callback)

    cb.get()('TOKEN_REFRESHED')

    expect(callback).not.toHaveBeenCalled()
  })

  test('returned unsubscribe function unsubscribes from the auth listener [obligation]', () => {
    const cb = captureAuthCallback()
    const unsubscribeFn = onSignedOut(vi.fn())

    unsubscribeFn()

    expect(cb.unsubscribe).toHaveBeenCalledOnce()
  })
})

describe('requestPasswordReset [obligation]', () => {
  test('returns "success" and calls resetPasswordForEmail with the email and a redirect URL [obligation]', async () => {
    mocks.resetPasswordForEmail.mockResolvedValueOnce({ error: null })

    await expect(requestPasswordReset('e@x.com')).resolves.toBe('success')

    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith('e@x.com', {
      redirectTo: expect.any(String)
    })
  })

  test('returns "error" when supabase returns an error — no account-existence-specific outcome [obligation]', async () => {
    mocks.resetPasswordForEmail.mockResolvedValueOnce({
      error: { message: 'rate limited' }
    })

    await expect(requestPasswordReset('e@x.com')).resolves.toBe('error')
  })

  test('returns "error" when resetPasswordForEmail throws [obligation]', async () => {
    mocks.resetPasswordForEmail.mockRejectedValueOnce(new Error('network failure'))
    await expect(requestPasswordReset('e@x.com')).resolves.toBe('error')
  })
})
