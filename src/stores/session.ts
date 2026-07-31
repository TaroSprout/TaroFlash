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
  updateEmail as supaUpdateEmail,
  updatePassword as supaUpdatePassword,
  requestPasswordReset as supaRequestPasswordReset,
  linkGoogleIdentity as supaLinkGoogleIdentity,
  unlinkGoogleIdentity as supaUnlinkGoogleIdentity,
  type SignupEmailOptions,
  type SignupOutcome,
  type LoginOutcome,
  type OAuthProvider,
  type UpdateEmailOutcome,
  type UpdatePasswordOutcome,
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

  const user = ref<User | undefined>(undefined)
  const loading_count = ref(0)
  let logging_out_intentionally = false

  const authenticated = computed(() => Boolean(user.value?.aud === 'authenticated'))
  const isLoading = computed(() => loading_count.value > 0)
  const identities = computed(() => user.value?.identities ?? [])
  const hasPasswordIdentity = computed(() => identities.value.some((i) => i.provider === 'email'))
  const hasGoogleIdentity = computed(() => identities.value.some((i) => i.provider === 'google'))

  // Supabase's client can locally sign itself out (e.g. a background token
  // refresh rejected because the session was revoked on another device)
  // without any component ever calling logout(). This is the "stale tab"
  // case: catch it here rather than only reacting to failed API calls.
  onSignedOut(() => {
    if (logging_out_intentionally) return
    forceLogout()
  })

  /**
   * True if this page load is a password-recovery redirect, after awaiting the
   * session exchange. False both for a normal load and for an expired/reused
   * recovery link (the exchange times out rather than firing the event).
   */
  async function checkPasswordRecovery(): Promise<boolean> {
    if (!isPasswordRecoveryUrl()) return false

    return waitForPasswordRecovery()
  }

  async function restoreSession(): Promise<boolean> {
    startLoading()

    try {
      if (!authenticated.value) {
        const session = await getSession()
        user.value = session?.user
      }

      return authenticated.value
    } catch (e: any) {
      logger.error(`Error initializing user: ${e.message}`)
      return false
    } finally {
      stopLoading()
    }
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

  // Same end state as logout(), but skipped when already logged out (avoids
  // reacting to its own signOut() call below) and explains why the session
  // ended instead of silently redirecting. `reason` only picks the copy —
  // every reason gets the same teardown + redirect.
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

  // Single funnel for a freshly established session: tear down the auth UI and
  // land on the dashboard. Every successful sign-in path (OAuth here, email
  // login/signup from their dialogs) routes through this, so no path can
  // navigate without closing its modal — the gap that left the OAuth popup's
  // parent modal open on top of the dashboard.
  function onAuthenticated(): void {
    closeAllModals()
    router.push({ name: 'dashboard' })
  }

  async function signInOAuth(provider: OAuthProvider): Promise<void> {
    const outcome = await supaSignInOAuth(provider)

    if (outcome === 'error') {
      notice.error(t('login-dialog.errors.generic'))
      return
    }

    onAuthenticated()
  }

  function updateEmail(email: string): Promise<UpdateEmailOutcome> {
    return supaUpdateEmail(email)
  }

  function updatePassword(password: string): Promise<UpdatePasswordOutcome> {
    return supaUpdatePassword(password)
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
  }

  // Single teardown funnel for both logout() and forceLogout(): clears auth
  // identity, then fans out to every bit of state that would otherwise leak
  // into the next session or the logged-out surface. The audio engine is left
  // running — logged-out surfaces still need sound.
  function reset() {
    user.value = undefined

    closeAllModals()
    clearQueryCache()
    taroPhone.reset()
  }

  /**
   * Teardown for a session the server has already revoked (account deletion).
   * reset() alone isn't enough — it clears this store but leaves supabase-js
   * holding the token, which then reads as a live session on the next visit.
   *
   * Flagged as intentional for the same reason logout() is: dropping the stored
   * session fires SIGNED_OUT, and forceLogout() reacting to it would stack a
   * "your session expired" notice on top of the caller's own messaging.
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

  /** Drop every entry from the Pinia Colada cache so stale data can't carry
   * over into the next login (Colada has no wholesale clear, so remove each). */
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
    hasGoogleIdentity,
    login,
    checkPasswordRecovery,
    restoreSession,
    logout,
    forceLogout,
    // Exposed for teardown after a server-side session revocation (account
    // deletion), where the sessions are already gone and only local state —
    // stored token, query cache, modals, phone — still needs clearing.
    discardRevokedSession,
    handleAuthError,
    signupEmail,
    signInOAuth,
    onAuthenticated,
    updateEmail,
    updatePassword,
    requestPasswordReset,
    linkGoogleIdentity,
    unlinkGoogleIdentity,
    startLoading,
    stopLoading
  }
})
