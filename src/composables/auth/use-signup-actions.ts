import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '@/stores/session'
import type { OAuthProvider } from '@/api/session'
import { emitSfx } from '@/sfx/bus'
import { validatePasswordFields } from '@/utils/password-validation'

type FieldName = 'username' | 'email' | 'password' | 'confirm_password'

export type SignupFieldErrors = Partial<Record<FieldName, string>>

export type SubmitResult = 'success' | 'invalid' | 'error'

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
}

/**
 * Sign-up form model + auth actions. Owns the field state, validation, and the
 * submit/OAuth calls so the form component stays presentational.
 *
 * Errors clear as the user recovers: typing in a field clears that field's error
 * (including the inline email-already-in-use message from the backend).
 *
 * `submit()` returns a `SubmitResult`: `'invalid'` keeps the modal open with
 * inline field errors, `'error'` signals a genuine request failure the caller
 * should surface (e.g. an alert), `'success'` means the account was created.
 */
export function useSignupActions() {
  const session = useSessionStore()
  const { t } = useI18n()

  const username = ref('')
  const email = ref('')
  const password = ref('')
  const confirm_password = ref('')
  const loading = ref(false)
  const errors = ref<SignupFieldErrors>({})

  const all_filled = computed(() =>
    Boolean(username.value.trim() && email.value.trim() && password.value && confirm_password.value)
  )

  /** Run client validation and store any field errors. Returns whether it passed. */
  function validate(): boolean {
    const e: SignupFieldErrors = {}

    if (!username.value.trim()) e.username = t('signup-dialog.form-validation.username-required')

    if (!email.value.trim()) e.email = t('signup-dialog.form-validation.email-required')
    else if (!isEmail(email.value)) e.email = t('signup-dialog.form-validation.email-invalid')

    Object.assign(
      e,
      validatePasswordFields(password.value, confirm_password.value, {
        required: t('signup-dialog.form-validation.password-required'),
        tooShort: t('signup-dialog.form-validation.password-too-short'),
        confirmRequired: t('signup-dialog.form-validation.confirm-password-required'),
        mismatch: t('signup-dialog.form-validation.confirm-password-mismatch')
      })
    )

    errors.value = e
    return Object.keys(e).length === 0
  }

  /** Validate, then create the account. See the hook doc for the result contract. */
  async function submit(): Promise<SubmitResult> {
    if (!validate()) {
      emitSfx('digi_powerdown')
      return 'invalid'
    }

    loading.value = true
    const outcome = await session.signupEmail(email.value.trim(), password.value, {
      display_name: username.value.trim()
    })
    loading.value = false

    if (outcome === 'success') return 'success'

    // Email-taken surfaces inline; the modal stays open, no alert needed.
    if (outcome === 'email-taken') {
      emitSfx('etc_woodblock_stuck')
      errors.value = {
        ...errors.value,
        email: t('signup-dialog.form-validation.email-already-in-use')
      }
      return 'invalid'
    }

    // Unexpected failure — caller surfaces a generic alert.
    return 'error'
  }

  /** Kick off an OAuth sign-in; the store handles the redirect/popup flow. */
  function submitOAuth(provider: OAuthProvider) {
    return session.signInOAuth(provider, { redirectTo: '/dashboard' })
  }

  // Typing in a field clears its own error so a user correcting one input never
  // stares at a stale error on the others.
  function clearOnInput(field: FieldName) {
    if (!errors.value[field]) return

    const next = { ...errors.value }
    delete next[field]
    errors.value = next
  }

  watch(username, () => clearOnInput('username'))
  watch(email, () => clearOnInput('email'))
  watch(password, () => clearOnInput('password'))
  watch(confirm_password, () => clearOnInput('confirm_password'))

  // reactive() so callers can pass the whole instance as a single prop and the
  // form can `v-model="auth.email"` without unwrapping each ref by hand.
  return reactive({
    username,
    email,
    password,
    confirm_password,
    errors,
    loading,
    all_filled,
    submit,
    submitOAuth
  })
}

export type SignupActions = ReturnType<typeof useSignupActions>
