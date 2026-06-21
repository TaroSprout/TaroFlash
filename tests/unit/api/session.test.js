import { describe, test, expect, beforeEach, afterEach, vi } from 'vite-plus/test'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
  signInWithOAuth: vi.fn(),
  onAuthStateChange: vi.fn()
}))

vi.mock('@/supabase-client', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      signInWithPassword: mocks.signInWithPassword,
      signOut: mocks.signOut,
      signUp: mocks.signUp,
      signInWithOAuth: mocks.signInWithOAuth,
      onAuthStateChange: mocks.onAuthStateChange
    }
  }
}))

import { getSession, login, logout, signupEmail, signInOAuth } from '@/api/session'

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
        'googleAuth',
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
