import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '@/stores/session'
import type { LoginOutcome, OAuthProvider } from '@/api/session'
import { emitSfx } from '@/sfx/bus'

type FieldName = 'email' | 'password'

export type LoginFieldErrors = Partial<Record<FieldName, string>>

export type SubmitResult = 'success' | 'invalid' | 'error'

// Backend outcomes that aren't a clean success map to one inline message above
// the submit button. `invalid-credentials` covers both wrong-password and
// no-such-account — Supabase merges them to prevent account enumeration.
const LOGIN_ERROR_KEYS: Record<Exclude<LoginOutcome, 'success'>, string> = {
  'invalid-credentials': 'login-dialog.errors.invalid-credentials',
  'email-not-confirmed': 'login-dialog.errors.email-not-confirmed',
  'rate-limited': 'login-dialog.errors.rate-limited',
  error: 'login-dialog.errors.generic'
}

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
}

/**
 * Login form model + auth actions. Owns the field state, client validation, and
 * the login/OAuth calls so the dialog stays presentational.
 *
 * Errors clear as the user recovers: typing in a field clears that field's error
 * plus the global backend message, and `reset()` wipes everything when the dialog
 * is reopened.
 *
 * `submit()` returns a `SubmitResult`: `'invalid'` keeps the dialog open with
 * inline field errors, `'error'` means the backend rejected the login and
 * `submitError` holds the message to surface above the submit button,
 * `'success'` means the session is live.
 */
export function useLoginActions() {
  const session = useSessionStore()
  const { t } = useI18n()

  const email = ref('')
  const password = ref('')
  const loading = ref(false)
  const errors = ref<LoginFieldErrors>({})
  const submitError = ref('')

  const all_filled = computed(() => Boolean(email.value.trim() && password.value))

  /** Run client validation and store any field errors. Returns whether it passed. */
  function validate(): boolean {
    const e: LoginFieldErrors = {}

    if (!email.value.trim()) e.email = t('login-dialog.form-validation.email-required')
    else if (!isEmail(email.value)) e.email = t('login-dialog.form-validation.email-invalid')

    if (!password.value) e.password = t('login-dialog.form-validation.password-required')

    errors.value = e
    return Object.keys(e).length === 0
  }

  /** Validate, then attempt a password login. See the hook doc for the result contract. */
  async function submit(): Promise<SubmitResult> {
    submitError.value = ''

    if (!validate()) {
      emitSfx('digi_powerdown')
      return 'invalid'
    }

    loading.value = true
    const outcome = await session.login(email.value.trim(), password.value)
    loading.value = false

    if (outcome === 'success') return 'success'

    emitSfx('etc_woodblock_stuck')
    submitError.value = t(LOGIN_ERROR_KEYS[outcome])
    return 'error'
  }

  /** Kick off an OAuth sign-in; the store handles the redirect/popup flow. */
  function submitOAuth(provider: OAuthProvider) {
    return session.signInOAuth(provider)
  }

  /** Clear all errors — used when the dialog is reopened so it starts fresh. */
  function reset() {
    errors.value = {}
    submitError.value = ''
  }

  // Typing in a field clears its own error and the global backend message, so a
  // user correcting one input never stares at a stale error on the other.
  function clearOnInput(field: FieldName) {
    if (errors.value[field]) {
      const next = { ...errors.value }
      delete next[field]
      errors.value = next
    }
    submitError.value = ''
  }

  watch(email, () => clearOnInput('email'))
  watch(password, () => clearOnInput('password'))

  // reactive() so callers can pass the whole instance as a single prop and the
  // form can `v-model="auth.email"` without unwrapping each ref by hand.
  return reactive({
    email,
    password,
    errors,
    loading,
    all_filled,
    submitError,
    submit,
    submitOAuth,
    reset
  })
}

export type LoginActions = ReturnType<typeof useLoginActions>
