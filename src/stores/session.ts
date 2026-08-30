import { defineStore } from 'pinia'
import type { User } from '@supabase/supabase-js'
import {
  getSession,
  getUser,
  isPasswordRecoveryUrl,
  isAuthError,
  onSignedOut,
  waitForPasswordRecovery,
  login as supaLogin,
  logout as supaLogout,
  signOutLocal as supaSignOutLocal,
  signupEmail as supaSignupEmail,
  signInOAuth as supaSignInOAuth,
  isNewAccountSession,
  updateEmail as supaUpdateEmail,
  updatePassword as supaUpdatePassword,
  verifyPassword as supaVerifyPassword,
  fetchHasPassword,
  requestReauthCode as supaRequestReauthCode,
  verifyReauthCode as supaVerifyReauthCode,
  requestPasswordReset as supaRequestPasswordReset,
  linkGoogleIdentity as supaLinkGoogleIdentity,
  unlinkGoogleIdentity as supaUnlinkGoogleIdentity,
  type SignupEmailOptions,
  type SignupOutcome,
  type LoginOutcome,
  type OAuthProvider,
  type UpdateEmailOutcome,
  type UpdatePasswordOutcome,
  type VerifyPasswordOutcome,
  type RequestReauthCodeOutcome,
  type VerifyReauthCodeOutcome,
  type RequestPasswordResetOutcome
} from '@/api/session'
import { useRouter } from 'vue-router'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQueryCache } from '@pinia/colada'
import logger from '@/utils/logger'
import { useNoticeStore } from '@/stores/notice-store'
import { useTaroPhoneStore } from '@/stores/taro-phone'
import { closeAll as closeAllModals } from '@/composables/modal'
import { clearPersistedSession } from '@/views/study-session/composables/session-persistence'
import { consumeReturnDestination } from '@/composables/auth/return-destination'
import { useTracking } from '@/composables/tracking'

/** Why a session was torn down without the member asking to log out. */
export type ForceLogoutReason = 'expired' | 'account-deleted'

const FORCE_LOGOUT_COPY: Record<ForceLogoutReason, { message: string; sub_message?: string }> = {
  expired: { message: 'session.expired-error' },
  'account-deleted': {
    message: 'member.account-deleted',
    sub_message: 'member.account-deleted-sub'
  }
}

export const useSessionStore = defineStore('sessionStore', () => {
  const router = useRouter()
  const { t } = useI18n()
  const notice = useNoticeStore()
  const queryCache = useQueryCache()
  const taroPhone = useTaroPhoneStore()
  const tracking = useTracking()

  const user = ref<User | undefined>(undefined)
  const has_password = ref(false)
  const loading_count = ref(0)
  let logging_out_intentionally = false

  // Every navigation awaits this one answer, so a cold load never resolves identity twice.
  let resolved: Promise<boolean> | undefined

  const authenticated = computed(() => Boolean(user.value?.aud === 'authenticated'))
  const isLoading = computed(() => loading_count.value > 0)
  const identities = computed(() => user.value?.identities ?? [])
  const hasPasswordIdentity = computed(() => identities.value.some((i) => i.provider === 'email'))
  const hasGoogleIdentity = computed(() => identities.value.some((i) => i.provider === 'google'))

  // The stale tab: a session ended on another device, with nothing here having asked to log out.
  onSignedOut(() => {
    if (logging_out_intentionally) return
    forceLogout()
  })

  /**
   * Whether this page load came from a working password-reset link. An expired
   * or already-used one reads as false, same as an ordinary visit.
   */
  async function checkPasswordRecovery(): Promise<boolean> {
    if (!isPasswordRecoveryUrl()) return false

    return waitForPasswordRecovery()
  }

  async function restoreSession(): Promise<boolean> {
    startLoading()

    try {
      if (authenticated.value) return authenticated.value

      const session = await getSession()
      user.value = session?.user
      if (authenticated.value) await refreshHasPassword()

      return authenticated.value
    } catch (e: any) {
      logger.error(`Error initializing user: ${e.message}`)
      return false
    } finally {
      stopLoading()
    }
  }

  /** Who is signed in, resolved once and shared by every navigation after it. */
  function ensureResolved(): Promise<boolean> {
    return (resolved ??= restoreSession())
  }

  /** Forces the next navigation to work out who is signed in again. Call on any sign-in or sign-out. */
  function clearResolved(): void {
    resolved = undefined
  }

  function login(email: string, password: string): Promise<LoginOutcome> {
    return supaLogin(email, password)
  }

  async function logout(): Promise<void> {
    logging_out_intentionally = true

    try {
      await supaLogout()
    } catch (e: any) {
      logger.error(`Error logging out: ${e.message}`)
      notice.error(t('session.logout-error'))
      return
    } finally {
      logging_out_intentionally = false
    }

    reset()
    router.push({ name: 'welcome' })
  }

  /** Call when an API response indicates the session is no longer valid server-side. */
  function handleAuthError(error: unknown): void {
    if (isAuthError(error)) forceLogout()
  }

  /**
   * Ends a session the member didn't ask to end, telling them why rather than
   * bouncing them silently. `reason` picks the wording; the teardown is one.
   */
  async function forceLogout(reason: ForceLogoutReason = 'expired'): Promise<void> {
    if (!authenticated.value) return

    const copy = FORCE_LOGOUT_COPY[reason]

    reset()
    notice.warn(t(copy.message), {
      subMessage: copy.sub_message ? t(copy.sub_message) : undefined,
      variant: 'panel',
      persist: true,
      closable: false,
      actions: [
        { label: t('session.expired-error-action'), onClick: () => {}, closesOnClick: true }
      ],
      onDismiss: () => router.push({ name: 'welcome' })
    })

    try {
      await supaLogout()
    } catch {
      // Session was already invalid server-side — nothing left to clean up.
    }
  }

  function signupEmail(
    email: string,
    password: string,
    opts?: SignupEmailOptions
  ): Promise<SignupOutcome> {
    return supaSignupEmail(email, password, opts)
  }

  /**
   * Settles the app into a just-signed-in state.
   *
   * Every sign-in path routes through here, so none of them can navigate
   * without first closing the dialog it was started from.
   */
  function onAuthenticated(): void {
    clearResolved()
    closeAllModals()
    // Wherever they were originally headed before being sent to sign in.
    router.push(consumeReturnDestination() ?? { name: 'dashboard' })
  }

  async function signInOAuth(provider: OAuthProvider): Promise<void> {
    const outcome = await supaSignInOAuth(provider)

    if (outcome === 'error') {
      notice.error(t('login-dialog.errors.generic'))
      return
    }

    // Covers the popup leg only — a redirect leg lands on /auth/callback in a
    // fresh page load, where this function never runs.
    if (await isNewAccountSession()) tracking.trackSignupCompleted()

    onAuthenticated()
  }

  function updateEmail(email: string): Promise<UpdateEmailOutcome> {
    return supaUpdateEmail(email)
  }

  async function updatePassword(password: string): Promise<UpdatePasswordOutcome> {
    const outcome = await supaUpdatePassword(password)

    if (outcome === 'success') await refreshHasPassword()

    return outcome
  }

  function verifyPassword(password: string): Promise<VerifyPasswordOutcome> {
    return supaVerifyPassword(password)
  }

  function requestReauthCode(): Promise<RequestReauthCodeOutcome> {
    return supaRequestReauthCode()
  }

  function verifyReauthCode(code: string): Promise<VerifyReauthCodeOutcome> {
    return supaVerifyReauthCode(code)
  }

  function requestPasswordReset(email: string): Promise<RequestPasswordResetOutcome> {
    return supaRequestPasswordReset(email)
  }

  async function linkGoogleIdentity(): Promise<void> {
    await supaLinkGoogleIdentity()
    await refreshUser()
  }

  async function unlinkGoogleIdentity(): Promise<void> {
    await supaUnlinkGoogleIdentity()
    await refreshUser()
  }

  async function refreshUser(): Promise<void> {
    user.value = (await getUser()) ?? undefined
    await refreshHasPassword()
  }

  /**
   * Re-asks whether the account can sign in with a password. Run it wherever
   * `user` is assigned, and after a password change.
   * →[K:password-identity-not-client-derivable]
   */
  async function refreshHasPassword(): Promise<void> {
    has_password.value = await fetchHasPassword()
  }

  /**
   * Clears everything that would otherwise leak into the next session or onto
   * the logged-out screens. Sound keeps playing — the welcome screen needs it.
   */
  function reset() {
    user.value = undefined
    has_password.value = false

    clearResolved()
    closeAllModals()
    clearQueryCache()
    taroPhone.reset()
    clearPersistedSession()
  }

  // Trap: an ended session's token keeps working until it is cleared →[K:deleted-account-token-outlives-deletion]
  /**
   * Tears down a session the server has already ended, token included.
   *
   * Flagged intentional for the reason `logout()` is: dropping the token
   * announces a sign-out, which would otherwise stack a "session expired"
   * notice on top of whatever the caller is already telling the member.
   */
  async function discardRevokedSession(): Promise<void> {
    logging_out_intentionally = true

    try {
      reset()
      await supaSignOutLocal()
    } finally {
      logging_out_intentionally = false
    }
  }

  /** Forgets every bit of fetched data, so none of it shows up under the next account. */
  function clearQueryCache() {
    queryCache.getEntries().forEach((entry) => queryCache.remove(entry))
  }

  function startLoading(): void {
    loading_count.value++
  }

  function stopLoading(): void {
    loading_count.value--
  }

  return {
    user,
    authenticated,
    isLoading,
    hasPasswordIdentity,
    hasPassword: has_password,
    hasGoogleIdentity,
    login,
    checkPasswordRecovery,
    restoreSession,
    ensureResolved,
    logout,
    forceLogout,
    discardRevokedSession,
    handleAuthError,
    signupEmail,
    signInOAuth,
    onAuthenticated,
    updateEmail,
    updatePassword,
    verifyPassword,
    requestReauthCode,
    verifyReauthCode,
    requestPasswordReset,
    linkGoogleIdentity,
    unlinkGoogleIdentity,
    startLoading,
    stopLoading
  }
})
