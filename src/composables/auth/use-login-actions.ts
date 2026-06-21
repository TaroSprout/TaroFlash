import { reactive, ref } from 'vue'
import { useSessionStore } from '@/stores/session'
import type { OAuthProvider } from '@/api/session'

export type LoginResult = 'success' | 'error'

/**
 * Login form model + auth actions. Owns the email/password state and the
 * login/OAuth calls so the dialog stays presentational.
 *
 * `submit()` returns a `LoginResult`: `'error'` leaves `errorMessage` set for
 * the caller to surface (e.g. a toast); `'success'` means the session is live.
 */
export function useLoginActions() {
  const session = useSessionStore()

  const email = ref('')
  const password = ref('')
  const loading = ref(false)
  const errorMessage = ref('')

  /** Attempt a password login. See the hook doc for the result contract. */
  async function submit(): Promise<LoginResult> {
    loading.value = true

    try {
      await session.login(email.value, password.value)
      return 'success'
    } catch (e: any) {
      errorMessage.value = e.message
      return 'error'
    } finally {
      loading.value = false
    }
  }

  /** Kick off an OAuth sign-in; the store handles the redirect/popup flow. */
  function submitOAuth(provider: OAuthProvider) {
    return session.signInOAuth(provider)
  }

  // reactive() so callers can pass the whole instance as a single prop and the
  // form can `v-model="auth.email"` without unwrapping each ref by hand.
  return reactive({
    email,
    password,
    loading,
    errorMessage,
    submit,
    submitOAuth
  })
}

export type LoginActions = ReturnType<typeof useLoginActions>
