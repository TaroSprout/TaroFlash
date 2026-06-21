import { supabase } from '@/supabase-client'
import type { Session } from '@supabase/supabase-js'
import logger from '@/utils/logger'

export type SignupEmailOptions = {
  display_name?: string
}

export type SignupOutcome = 'success' | 'email-taken' | 'error'

export type LoginOutcome =
  | 'success'
  | 'invalid-credentials'
  | 'email-not-confirmed'
  | 'rate-limited'
  | 'error'

export type SignupOAuthOptions = {
  redirectTo?: string
  skipBrowserRedirect?: boolean
}

export type OAuthProvider = 'google'

const AUTH_REDIRECT_URL =
  import.meta.env.DEV && typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? `http://${window.location.hostname}:5173/auth/callback`
    : import.meta.env.VITE_AUTH_REDIRECT_URL

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    throw new Error(error.message)
  }

  return data?.session
}

export async function login(email: string, password: string): Promise<LoginOutcome> {
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (!error) return 'success'

    // Supabase folds "no such user" into invalid_credentials to prevent account
    // enumeration, so this single code covers both wrong-password and no-account.
    if (error.code === 'invalid_credentials') return 'invalid-credentials'
    if (error.code === 'email_not_confirmed') return 'email-not-confirmed'
    if (error.status === 429) return 'rate-limited'

    logger.error(`Login failed: ${error.message}`)
    return 'error'
  } catch (e: any) {
    logger.error(`Login failed: ${e.message}`)
    return 'error'
  }
}

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw new Error(error.message)
  }
}

export async function signupEmail(
  email: string,
  password: string,
  opts?: SignupEmailOptions
): Promise<SignupOutcome> {
  try {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: opts
      }
    })

    if (!error) return 'success'
    if (error.code === 'user_already_exists') return 'email-taken'

    logger.error(`Signup failed: ${error.message}`)
    return 'error'
  } catch (e: any) {
    logger.error(`Signup failed: ${e.message}`)
    return 'error'
  }
}

function prefersFullRedirect(): boolean {
  return window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768
}

export async function signInOAuth(
  provider: OAuthProvider,
  options?: SignupOAuthOptions
): Promise<void> {
  if (prefersFullRedirect()) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: AUTH_REDIRECT_URL,
        ...options
      }
    })
    if (error) throw error
    return
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      skipBrowserRedirect: true,
      redirectTo: AUTH_REDIRECT_URL,
      ...options
    }
  })

  if (error || !data?.url) {
    throw error ?? new Error('No URL returned')
  }

  const width = 500
  const height = 600
  const left = window.screenX + (window.outerWidth - width) / 2
  const top = window.screenY + (window.outerHeight - height) / 2
  const popupFeatures = `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`

  const popup = window.open(data.url, 'googleAuth', popupFeatures)

  if (!popup || popup.closed || typeof popup.closed === 'undefined') {
    window.location.href = data.url
    return
  }

  const TIMEOUT_MS = 5 * 60 * 1000

  return new Promise<void>((resolve, reject) => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        cleanup()
        resolve()
      }
    })

    const timeout = window.setTimeout(() => {
      cleanup()
      reject(new Error('OAuth timed out'))
    }, TIMEOUT_MS)

    function cleanup() {
      sub.subscription.unsubscribe()
      window.clearTimeout(timeout)
    }
  })
}
