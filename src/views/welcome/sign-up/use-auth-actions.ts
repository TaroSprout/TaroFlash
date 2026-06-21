import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '@/stores/session'
import type { OAuthProvider } from '@/api/session'
import { emitSfx } from '@/sfx/bus'

type FieldName = 'username' | 'email' | 'password' | 'confirm_password'

export type SubmitResult = 'success' | 'invalid' | 'error'

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
}

/**
 * Sign-up form model + auth actions. Owns the field state, validation, and the
 * submit/OAuth calls so the form component stays presentational.
 *
 * `submit()` returns a `SubmitResult`: `'invalid'` keeps the modal open with
 * inline field errors, `'error'` signals a genuine request failure the caller
 * should surface (e.g. an alert), `'success'` means the account was created.
 */
export function useAuthActions() {
  const session = useSessionStore()
  const { t } = useI18n()

  const username = ref('')
  const email = ref('')
  const password = ref('')
  const confirm_password = ref('')
  const tried_submit = ref(false)
  const loading = ref(false)
  const serverErrors = ref<Partial<Record<FieldName, string>>>({})

  const clientErrors = computed(() => {
    const e: Partial<Record<FieldName, string>> = {}

    if (tried_submit.value && !username.value.trim())
      e.username = t('signup-dialog.form-validation.username-required')

    if (tried_submit.value && !email.value.trim())
      e.email = t('signup-dialog.form-validation.email-required')
    else if (tried_submit.value && !isEmail(email.value))
      e.email = t('signup-dialog.form-validation.email-invalid')

    if (tried_submit.value && !password.value)
      e.password = t('signup-dialog.form-validation.password-required')
    else if (tried_submit.value && password.value.length < 8)
      e.password = t('signup-dialog.form-validation.password-too-short')

    if (tried_submit.value && !confirm_password.value)
      e.confirm_password = t('signup-dialog.form-validation.confirm-password-required')
    else if (tried_submit.value && confirm_password.value !== password.value)
      e.confirm_password = t('signup-dialog.form-validation.confirm-password-mismatch')

    return e
  })

  const errors = computed(() => ({
    ...serverErrors.value,
    ...clientErrors.value // client wins if both exist
  }))

  const isValid = computed(() => Object.keys(errors.value).length === 0)

  const all_filled = computed(() =>
    Boolean(username.value.trim() && email.value.trim() && password.value && confirm_password.value)
  )

  /** Validate, then create the account. See the hook doc for the result contract. */
  async function submit(): Promise<SubmitResult> {
    tried_submit.value = true

    if (!isValid.value) {
      emitSfx('etc_woodblock_stuck')
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
      serverErrors.value.email = t('signup-dialog.form-validation.email-already-in-use')
      return 'invalid'
    }

    // Unexpected failure — caller surfaces a generic alert.
    return 'error'
  }

  /** Kick off an OAuth sign-in; the store handles the redirect/popup flow. */
  function submitOAuth(provider: OAuthProvider) {
    return session.signInOAuth(provider, { redirectTo: '/dashboard' })
  }

  // reactive() so callers can pass the whole instance as a single prop and the
  // form can `v-model="auth.email"` without unwrapping each ref by hand.
  return reactive({
    username,
    email,
    password,
    confirm_password,
    errors,
    isValid,
    loading,
    all_filled,
    submit,
    submitOAuth
  })
}

export type AuthActions = ReturnType<typeof useAuthActions>
