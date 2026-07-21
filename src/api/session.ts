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

// In dev, requests can come from a LAN hostname (e.g. testing on a phone) rather
// than localhost — Supabase must redirect back to that same hostname, not the
// prod URL baked into the env var.
function buildRedirectUrl(path: string, prodUrl: string): string {
  if (
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost'
  ) {
    return `http://${window.location.hostname}:5173${path}`
  }
  return prodUrl
}

const AUTH_REDIRECT_URL = buildRedirectUrl('/auth/callback', import.meta.env.VITE_AUTH_REDIRECT_URL)
const RESET_PASSWORD_REDIRECT_URL = buildRedirectUrl(
  '/welcome',
  import.meta.env.VITE_RESET_PASSWORD_REDIRECT_URL
)

const GET_SESSION_TIMEOUT_MS = 2000

// getSession() triggers a background refresh_token request when the cached
// session is expired. supabase-js wraps any network failure on that request
// (e.g. connection refused) as retryable and retries with backoff for up to
// 30s before surfacing an error — there's no way to special-case it sooner
// from out here. Race it against a short timeout so a dead connection still
// bails out fast instead of stalling anything awaiting it (e.g. the root
// route's auth guard) for the full retry window.
export async function getSession(): Promise<Session | null> {
  const { data, error } = await Promise.race([
    supabase.auth.getSession(),
    new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error('getSession timed out')), GET_SESSION_TIMEOUT_MS)
    })
  ])

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

// Supabase's recovery link lands the browser back on the site with tokens in
// the URL hash (implicit flow); the client auto-exchanges them and fires this
// event once. Checking the URL first means a normal visit never pays for the
// listener/await this needs.
export function isPasswordRecoveryUrl(): boolean {
  return (
    window.location.hash.includes('type=recovery') ||
    new URLSearchParams(window.location.search).get('type') === 'recovery'
  )
}

const PASSWORD_RECOVERY_TIMEOUT_MS = 8000

// An expired or already-used recovery link still carries `type=recovery` but
// Supabase never fires the event for it, so this can't just await forever —
// it resolves false after a timeout and lets the caller fall back to a normal
// page load instead of hanging with a dangling subscription.
export function waitForPasswordRecovery(): Promise<boolean> {
  return new Promise((resolve) => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== 'PASSWORD_RECOVERY') return
      cleanup()
      resolve(true)
    })

    const timeout = window.setTimeout(() => {
      cleanup()
      resolve(false)
    }, PASSWORD_RECOVERY_TIMEOUT_MS)

    function cleanup() {
      sub.subscription.unsubscribe()
      window.clearTimeout(timeout)
    }
  })
}

// Fires when Supabase's client gives up on the session locally — a manual
// sign-out, or its own background token refresh failing because the session
// was revoked/expired elsewhere. Returns an unsubscribe function.
export function onSignedOut(callback: () => void): () => void {
  const { data: sub } = supabase.auth.onAuthStateChange((event) => {
    if (event !== 'SIGNED_OUT') return
    callback()
  })

  return () => sub.subscription.unsubscribe()
}

// A revoked/expired session doesn't always trigger onSignedOut before the
// next API call — the request itself can come back 401/JWT-expired first.
// This lets callers recognize that case and treat it the same way.
export function isAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const { status, code, name } = error as { status?: number; code?: string; name?: string }
  return status === 401 || code === 'PGRST301' || name === 'AuthApiError'
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

/**
 * Whether `name` is free as a display name (case-insensitive), via the
 * `is_display_name_available` RPC. Fails open — a check failure returns `true`
 * so a flaky network never blocks signup; the unique constraint is the real
 * backstop.
 */
export async function isDisplayNameAvailable(name: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_display_name_available', {
    candidate: name.trim()
  })

  if (error) {
    logger.error(`Display-name availability check failed: ${error.message}`)
    return true
  }

  return data
}

function prefersFullRedirect(): boolean {
  return window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768
}

type StartOAuth = (options: {
  redirectTo: string
  skipBrowserRedirect?: boolean
}) => Promise<{ data: { url: string | null } | null; error: unknown }>

// Google's consent screen sends Cross-Origin-Opener-Policy, which forces a
// permanent browsing-context-group switch on the popup — window.opener is
// severed for good, and window.name (tied to that same context) doesn't
// survive the swap either, even once the popup navigates back to our own
// origin. localStorage isn't scoped to the browsing-context group the way
// those are, so a flag written right before window.open() is still readable
// once the popup lands back on our site.
const OAUTH_POPUP_FLAG = 'oauth-popup-pending'

// Cleared unconditionally up front so a flag left behind by an abandoned
// popup (closed before completing auth) can't misfire on a later full-page
// redirect flow.
function clearOAuthPopupFlag(): void {
  window.localStorage.removeItem(OAUTH_POPUP_FLAG)
}

/** Callback view checks this to decide whether to close itself or navigate to the dashboard. */
export function consumeOAuthPopupFlag(): boolean {
  const pending = window.localStorage.getItem(OAUTH_POPUP_FLAG) === '1'
  clearOAuthPopupFlag()
  return pending
}

// Sign-in resolves on the store's own 'SIGNED_IN' auth event; linking a new
// identity to an already-signed-in user doesn't fire that event, so it resolves
// once the popup/redirect tab closes instead.
async function runOAuthFlow(
  start: StartOAuth,
  waitFor: 'signed-in' | 'popup-closed'
): Promise<void> {
  clearOAuthPopupFlag()

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

  window.localStorage.setItem(OAUTH_POPUP_FLAG, '1')

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

export type UpdatePasswordOutcome = 'success' | 'weak-password' | 'same-password' | 'error'

export async function updatePassword(password: string): Promise<UpdatePasswordOutcome> {
  try {
    const { error } = await supabase.auth.updateUser({ password })

    if (!error) return 'success'
    if (error.code === 'weak_password') return 'weak-password'
    if (error.code === 'same_password') return 'same-password'

    logger.error(`Password update failed: ${error.message}`)
    return 'error'
  } catch (e: any) {
    logger.error(`Password update failed: ${e.message}`)
    return 'error'
  }
}

export type RequestPasswordResetOutcome = 'success' | 'error'

// Supabase doesn't error for an unknown email (prevents account enumeration),
// so unlike login/signup there's no keyed outcome map — only real backend
// failures (rate limit, network) fall through to 'error'.
export async function requestPasswordReset(email: string): Promise<RequestPasswordResetOutcome> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: RESET_PASSWORD_REDIRECT_URL
    })

    if (!error) return 'success'

    logger.error(`Password reset request failed: ${error.message}`)
    return 'error'
  } catch (e: any) {
    logger.error(`Password reset request failed: ${e.message}`)
    return 'error'
  }
}
