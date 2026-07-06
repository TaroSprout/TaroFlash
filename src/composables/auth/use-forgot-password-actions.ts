import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '@/stores/session'
import { isEmail } from '@/utils/is-email'
import { emitSfx } from '@/sfx/bus'

export type ForgotPasswordFieldErrors = Partial<Record<'email', string>>

export type SubmitResult = 'success' | 'invalid' | 'error'

/**
 * Forgot-password request form model + action. Owns the email field, client
 * validation, and the `resetPasswordForEmail` call so the modal stays
 * presentational.
 *
 * `submit()` always shows the same success message regardless of whether the
 * email belongs to an account — Supabase itself doesn't distinguish, to
 * prevent account enumeration.
 */
export function useForgotPasswordActions() {
  const session = useSessionStore()
  const { t } = useI18n()

  const email = ref('')
  const loading = ref(false)
  const errors = ref<ForgotPasswordFieldErrors>({})
  const submitError = ref('')
  const success = ref(false)

  const all_filled = computed(() => Boolean(email.value.trim()))

  function validate(): boolean {
    const e: ForgotPasswordFieldErrors = {}

    if (!email.value.trim()) e.email = t('forgot-password-modal.form-validation.email-required')
    else if (!isEmail(email.value))
      e.email = t('forgot-password-modal.form-validation.email-invalid')

    errors.value = e
    return Object.keys(e).length === 0
  }

  async function submit(): Promise<SubmitResult> {
    submitError.value = ''

    if (!validate()) {
      emitSfx('digi_powerdown')
      return 'invalid'
    }

    loading.value = true
    const outcome = await session.requestPasswordReset(email.value.trim())
    loading.value = false

    if (outcome === 'success') {
      success.value = true
      return 'success'
    }

    emitSfx('etc_woodblock_stuck')
    submitError.value = t('forgot-password-modal.errors.generic')
    return 'error'
  }

  watch(email, () => {
    if (errors.value.email) errors.value = {}
    submitError.value = ''
  })

  return reactive({
    email,
    errors,
    loading,
    all_filled,
    submitError,
    success,
    submit
  })
}

export type ForgotPasswordActions = ReturnType<typeof useForgotPasswordActions>
