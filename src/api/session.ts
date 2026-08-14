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

export type OAuthProvider = 'google'

/**
 * Where an auth email or consent screen sends the browser back to — the machine
 * you're testing from in dev, the production URL everywhere else.
 */
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

/**
 * The session this browser is holding, or `null`.
 *
 * Raced against a 2s timeout: a dead connection makes the silent token renewal
 * retry for far longer than anything waiting on identity can sit still for.
 * →[K:session-restore-retry-storm]
 */
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

/**
 * The account as the server currently sees it. Ask after linking or unlinking a
 * sign-in method — the stored session keeps the old list.
 */
export async function getUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    throw new Error(error.message)
  }

  return data?.user
}

/**
 * Whether this page load arrived from a password-reset link. Checked before
 * anything else so an ordinary visit never pays for the wait that follows.
 */
export function isPasswordRecoveryUrl(): boolean {
  return (
    window.location.hash.includes('type=recovery') ||
    new URLSearchParams(window.location.search).get('type') === 'recovery'
  )
}

const PASSWORD_RECOVERY_TIMEOUT_MS = 8000

/**
 * Whether the reset link's tokens were accepted, giving up after 8s.
 *
 * An expired or already-used link looks identical in the address bar and simply
 * never arrives, so waiting on it forever would hang the page load.
 */
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

/**
 * Calls back when the auth library drops the session by itself — a sign-out
 * here, or a renewal refused because the session was ended on another device.
 * Returns an unsubscribe.
 */
export function onSignedOut(callback: () => void): () => void {
  const { data: sub } = supabase.auth.onAuthStateChange((event) => {
    if (event !== 'SIGNED_OUT') return
    callback()
  })

  return () => sub.subscription.unsubscribe()
}

/**
 * Whether a request failed because the session is no longer good. An ended
 * session usually surfaces here before `onSignedOut` gets to fire.
 */
export function isAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const { status, code, name } = error as { status?: number; code?: string; name?: string }
  return status === 401 || code === 'PGRST301' || name === 'AuthApiError'
}

export async function login(email: string, password: string): Promise<LoginOutcome> {
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (!error) return 'success'

    // One code covers a wrong password and no such account — the server won't say which.
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

// Trap: an ended session's token keeps working until it is cleared →[K:deleted-account-token-outlives-deletion]
/**
 * Drops this browser's copy of the session, for when the server has already
 * ended it. Logged and swallowed — teardown with nothing left to retry.
 */
export async function signOutLocal(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: 'local' })

  if (error) {
    logger.error(`Local sign-out failed: ${error.message}`)
  }
}

/**
 * Ends every session for this account except this one.
 *
 * Logged and swallowed: it runs after a password change has already succeeded,
 * so a failure here must not report the completed change as failed.
 */
export async function signOutOthers(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: 'others' })

  if (error) {
    logger.error(`Sign-out of other sessions failed: ${error.message}`)
  }
}

/**
 * Requests account deletion — marks the account pending, refunds any
 * subscription pro rata, ends every session — and resolves with the deadline.
 *
 * Asking twice returns the original deadline rather than extending the grace
 * window. Nothing afterwards can depend on an authenticated request succeeding.
 */
export async function requestAccountDeletion(): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ deleteAt: string }>(
    'request-account-deletion',
    { body: {} }
  )

  if (error || !data?.deleteAt) {
    logger.error(error?.message ?? 'request-account-deletion returned no deleteAt')
    throw error ?? new Error('No deleteAt returned')
  }

  return data.deleteAt
}

/**
 * Calls off a pending deletion, giving the member their data back and making
 * their previously-public decks public again.
 *
 * The cancelled subscription does not come back — re-subscribing is manual.
 * Throws once the deadline has passed, when the purge may already be running.
 */
export async function restoreAccount(): Promise<void> {
  const { error } = await supabase.rpc('restore_account')

  if (error) {
    logger.error(error.message)
    throw error
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
 * Whether a display name is still free, ignoring case.
 *
 * Fails open, so a flaky connection never blocks signup — the database's own
 * uniqueness rule is what actually holds the line.
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

// Trap: the consent screen severs the popup's link to the window that opened it →[K:oauth-popup-loses-its-opener]
const OAUTH_POPUP_FLAG = 'oauth-popup-pending'

function clearOAuthPopupFlag(): void {
  window.localStorage.removeItem(OAUTH_POPUP_FLAG)
}

/**
 * Whether this page load is the return leg of a sign-in popup. Reading it
 * clears it.
 */
export function consumeOAuthPopupFlag(): boolean {
  const pending = window.localStorage.getItem(OAUTH_POPUP_FLAG) === '1'
  clearOAuthPopupFlag()
  return pending
}

/**
 * Runs a Google flow in a popup, or as a full-page redirect on a phone.
 *
 * Signing in finishes on the sign-in event. Adding a new sign-in method to an
 * account fires no such event, so that variant waits for the popup to close.
 */
async function runOAuthFlow(
  start: StartOAuth,
  waitFor: 'signed-in' | 'popup-closed'
): Promise<void> {
  // An abandoned popup leaves the flag behind, where it would misfire on the next attempt.
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

// A real account/session round trip lands well inside this; a returning
// member's account is always far older, so the two never get confused.
const NEW_ACCOUNT_WINDOW_MS = 30_000 // 30 seconds

/**
 * Whether the account behind the current session was made just now, rather
 * than one that already existed before this sign-in.
 *
 * Google's flow hands back a session either way, with nothing on it that says
 * which — so freshness is inferred from `created_at` against the moment the
 * session resolved, not from which modal started the flow.
 */
export async function isNewAccountSession(): Promise<boolean> {
  const session = await getSession()
  const createdAt = session?.user.created_at
  if (!createdAt) return false

  return Date.now() - new Date(createdAt).getTime() < NEW_ACCOUNT_WINDOW_MS
}

export type OAuthOutcome = 'success' | 'error'

/**
 * Signs in with Google.
 *
 * `provider` is the only knob on purpose: a caller-supplied return address both
 * breaks the popup's self-close and is the classic open-redirect footgun.
 * →[K:oauth-popup-loses-its-opener]
 */
export async function signInOAuth(provider: OAuthProvider): Promise<OAuthOutcome> {
  try {
    await runOAuthFlow(
      (opts) => supabase.auth.signInWithOAuth({ provider, options: opts }),
      'signed-in'
    )
    return 'success'
  } catch (e: any) {
    logger.error(`OAuth sign-in failed: ${e.message}`)
    return 'error'
  }
}

/** Adds Google as a second way to sign in to the account already signed in here. */
export async function linkGoogleIdentity(): Promise<void> {
  await runOAuthFlow(
    (opts) => supabase.auth.linkIdentity({ provider: 'google', options: opts }),
    'popup-closed'
  )

  // The popup closing says the other tab finished, not that this one knows about it yet.
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

/**
 * Whether this account can sign in with a password.
 *
 * Falls back to `false`, which routes the member to the emailed code — still a
 * real proof, where `true` would offer a password field to someone who has
 * none. →[K:password-identity-not-client-derivable]
 */
export async function fetchHasPassword(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('member_has_password')

    if (error) {
      logger.error(`Password lookup failed: ${error.message}`)
      return false
    }

    return data === true
  } catch (e: any) {
    logger.error(`Password lookup failed: ${e.message}`)
    return false
  }
}

export type VerifyPasswordOutcome = 'success' | 'invalid-credentials' | 'error'

/**
 * Re-proves identity for a member who has a password, by signing them in again.
 *
 * The address comes off the live session rather than an argument — that is the
 * same-account guard, so a successful sign-in to someone *else's* account can
 * never be handed back as proof.
 */
export async function verifyPassword(password: string): Promise<VerifyPasswordOutcome> {
  try {
    const session = await getSession()
    const email = session?.user.email

    if (!email) {
      logger.error('Password verification failed: no email on the current session')
      return 'error'
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (!error) return 'success'
    if (error.code === 'invalid_credentials') return 'invalid-credentials'

    logger.error(`Password verification failed: ${error.message}`)
    return 'error'
  } catch (e: any) {
    logger.error(`Password verification failed: ${e.message}`)
    return 'error'
  }
}

export type RequestReauthCodeOutcome = 'success' | 'rate-limited' | 'error'

/**
 * Emails a one-time sign-in code — the identity re-proof for a member with no
 * password to re-enter.
 *
 * Same-account twice over: the address comes off the live session, and a stray
 * one can't quietly mint a new account instead. Deliberately not the sign-in
 * popup, which becomes a full-page redirect on a phone and would abandon the
 * half-filled form, and deliberately not the library's own reauthenticate call,
 * which gates nothing here. →[K:reauth-nonce-does-not-gate]
 */
export async function requestReauthCode(): Promise<RequestReauthCodeOutcome> {
  try {
    const session = await getSession()
    const email = session?.user.email

    if (!email) {
      logger.error('Reauth code request failed: no email on the current session')
      return 'error'
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false }
    })

    if (!error) return 'success'
    if (error.status === 429) return 'rate-limited'

    logger.error(`Reauth code request failed: ${error.message}`)
    return 'error'
  } catch (e: any) {
    logger.error(`Reauth code request failed: ${e.message}`)
    return 'error'
  }
}

export type VerifyReauthCodeOutcome = 'success' | 'invalid-code' | 'error'

/**
 * Spends the emailed code, signing the member in again — that fresh sign-in
 * *is* the proof.
 *
 * A wrong code and an expired one come back identical, deliberately, so both
 * collapse into one outcome here.
 */
export async function verifyReauthCode(code: string): Promise<VerifyReauthCodeOutcome> {
  try {
    const session = await getSession()
    const email = session?.user.email

    if (!email) {
      logger.error('Reauth code verification failed: no email on the current session')
      return 'error'
    }

    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })

    if (!error) return 'success'
    if (error.code === 'otp_expired') return 'invalid-code'

    logger.error(`Reauth code verification failed: ${error.message}`)
    return 'error'
  } catch (e: any) {
    logger.error(`Reauth code verification failed: ${e.message}`)
    return 'error'
  }
}

export type UpdatePasswordOutcome = 'success' | 'weak-password' | 'same-password' | 'error'

/**
 * Sets a new password, then ends every other session for the account.
 *
 * The sign-out lives here so both flows that end in a new password close off
 * anyone who already had access. Re-proving identity is the caller's job.
 */
export async function updatePassword(password: string): Promise<UpdatePasswordOutcome> {
  try {
    const { error } = await supabase.auth.updateUser({ password })

    if (!error) {
      await signOutOthers()
      return 'success'
    }

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

/**
 * Emails a reset link. An unknown address succeeds like any other — the server
 * won't reveal whether an account exists, so only real failures reach 'error'.
 */
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
