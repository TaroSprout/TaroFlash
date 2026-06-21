import { defineStore } from 'pinia'
import type { User } from '@supabase/supabase-js'
import {
  getSession,
  login as supaLogin,
  logout as supaLogout,
  signupEmail as supaSignupEmail,
  signInOAuth as supaSignInOAuth,
  type SignupEmailOptions,
  type SignupOAuthOptions,
  type SignupOutcome,
  type LoginOutcome,
  type OAuthProvider
} from '@/api/session'
import { useRouter } from 'vue-router'
import { computed, ref } from 'vue'
import logger from '@/utils/logger'

export const useSessionStore = defineStore('sessionStore', () => {
  const router = useRouter()

  const user = ref<User | undefined>(undefined)
  const loading_count = ref(0)

  const authenticated = computed(() => Boolean(user.value?.aud === 'authenticated'))
  const isLoading = computed(() => loading_count.value > 0)

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
    }

    router.push({ name: 'dashboard' })
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
    login,
    restoreSession,
    logout,
    signupEmail,
    signInOAuth,
    startLoading,
    stopLoading
  }
})
