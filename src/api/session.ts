import { supabase } from '@/supabase-client'
import type { Session, User } from '@supabase/supabase-js'
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

// Unlike getSession(), this revalidates against the server rather than reading
// the cached session — needed after linking/unlinking an identity, since that
// doesn't rewrite the cached session's `identities` array.
export async function getUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    throw new Error(error.message)
  }

  return data?.user
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

type StartOAuth = (options: {
  redirectTo: string
  skipBrowserRedirect?: boolean
}) => Promise<{ data: { url: string | null } | null; error: unknown }>

// Sign-in resolves on the store's own 'SIGNED_IN' auth event; linking a new
// identity to an already-signed-in user doesn't fire that event, so it resolves
// once the popup/redirect tab closes instead.
async function runOAuthFlow(
  start: StartOAuth,
  waitFor: 'signed-in' | 'popup-closed'
): Promise<void> {
  if (prefersFullRedirect()) {
    const { error } = await start({ redirectTo: AUTH_REDIRECT_URL })
    if (error) throw error
    return
  }

  const { data, error } = await start({ redirectTo: AUTH_REDIRECT_URL, skipBrowserRedirect: true })

  if (error || !data?.url) {
    throw error ?? new Error('No URL returned')
  }

  const width = 500
  const height = 600
  const left = window.screenX + (window.outerWidth - width) / 2
  const top = window.screenY + (window.outerHeight - height) / 2
  const popupFeatures = `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`

  const popup = window.open(data.url, 'oauthFlow', popupFeatures)

  if (!popup || popup.closed || typeof popup.closed === 'undefined') {
    window.location.href = data.url
    return
  }

  const TIMEOUT_MS = 5 * 60 * 1000

  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup()
      reject(new Error('OAuth timed out'))
    }, TIMEOUT_MS)

    if (waitFor === 'popup-closed') {
      const interval = window.setInterval(() => {
        if (!popup.closed) return
        cleanup()
        resolve()
      }, 500)

      function cleanup() {
        window.clearInterval(interval)
        window.clearTimeout(timeout)
      }
      return
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        cleanup()
        resolve()
      }
    })

    function cleanup() {
      sub.subscription.unsubscribe()
      window.clearTimeout(timeout)
    }
  })
}

export async function signInOAuth(
  provider: OAuthProvider,
  options?: SignupOAuthOptions
): Promise<void> {
  return runOAuthFlow(
    (opts) => supabase.auth.signInWithOAuth({ provider, options: { ...opts, ...options } }),
    'signed-in'
  )
}

/** Links a Google identity to the currently signed-in user. Requires `enable_manual_linking`. */
export async function linkGoogleIdentity(): Promise<void> {
  await runOAuthFlow(
    (opts) => supabase.auth.linkIdentity({ provider: 'google', options: opts }),
    'popup-closed'
  )

  // The popup closing only means the linking tab is done — it doesn't guarantee
  // this tab's client has picked up the new identity (no 'SIGNED_IN'-style event
  // fires for linking). Force a resync so the caller sees it immediately instead
  // of only after a page reload.
  const { error } = await supabase.auth.refreshSession()
  if (error) throw error
}

export async function unlinkGoogleIdentity(): Promise<void> {
  const { data, error } = await supabase.auth.getUserIdentities()
  if (error) throw error

  const identity = data?.identities.find((i) => i.provider === 'google')
  if (!identity) return

  const { error: unlinkError } = await supabase.auth.unlinkIdentity(identity)
  if (unlinkError) throw unlinkError
}

export type UpdateEmailOutcome = 'success' | 'email-taken' | 'error'

export async function updateEmail(email: string): Promise<UpdateEmailOutcome> {
  try {
    const { error } = await supabase.auth.updateUser({ email })

    if (!error) return 'success'
    if (error.code === 'email_exists') return 'email-taken'

    logger.error(`Email update failed: ${error.message}`)
    return 'error'
  } catch (e: any) {
    logger.error(`Email update failed: ${e.message}`)
    return 'error'
  }
}

export type UpdatePasswordOutcome = 'success' | 'weak-password' | 'error'

export async function updatePassword(password: string): Promise<UpdatePasswordOutcome> {
  try {
    const { error } = await supabase.auth.updateUser({ password })

    if (!error) return 'success'
    if (error.code === 'weak_password') return 'weak-password'

    logger.error(`Password update failed: ${error.message}`)
    return 'error'
  } catch (e: any) {
    logger.error(`Password update failed: ${e.message}`)
    return 'error'
  }
}
