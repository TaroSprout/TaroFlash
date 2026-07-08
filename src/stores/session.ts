import { defineStore } from 'pinia'
import type { User } from '@supabase/supabase-js'
import {
  getSession,
  getUser,
  isPasswordRecoveryUrl,
  waitForPasswordRecovery,
  login as supaLogin,
  logout as supaLogout,
  signupEmail as supaSignupEmail,
  signInOAuth as supaSignInOAuth,
  updateEmail as supaUpdateEmail,
  updatePassword as supaUpdatePassword,
  requestPasswordReset as supaRequestPasswordReset,
  linkGoogleIdentity as supaLinkGoogleIdentity,
  unlinkGoogleIdentity as supaUnlinkGoogleIdentity,
  type SignupEmailOptions,
  type SignupOAuthOptions,
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
import logger from '@/utils/logger'
import { useNoticeStore } from '@/stores/notice-store'

export const useSessionStore = defineStore('sessionStore', () => {
  const router = useRouter()
  const { t } = useI18n()
  const notice = useNoticeStore()

  const user = ref<User | undefined>(undefined)
  const loading_count = ref(0)

  const authenticated = computed(() => Boolean(user.value?.aud === 'authenticated'))
  const isLoading = computed(() => loading_count.value > 0)
  const identities = computed(() => user.value?.identities ?? [])
  const hasPasswordIdentity = computed(() => identities.value.some((i) => i.provider === 'email'))
  const hasGoogleIdentity = computed(() => identities.value.some((i) => i.provider === 'google'))

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
    await supaLogout()
    reset()
    router.push({ name: 'welcome' })
  }

  function signupEmail(
    email: string,
    password: string,
    opts?: SignupEmailOptions
  ): Promise<SignupOutcome> {
    return supaSignupEmail(email, password, opts)
  }

  async function signInOAuth(provider: OAuthProvider, options?: SignupOAuthOptions): Promise<void> {
    try {
      await supaSignInOAuth(provider, options)
    } catch (e: any) {
      logger.error(`Error signing in with OAuth: ${e.message}`)
      notice.error(t('login-dialog.errors.generic'))
      return
    }

    router.push({ name: 'dashboard' })
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

  function reset() {
    user.value = undefined
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
    signupEmail,
    signInOAuth,
    updateEmail,
    updatePassword,
    requestPasswordReset,
    linkGoogleIdentity,
    unlinkGoogleIdentity,
    startLoading,
    stopLoading
  }
})
