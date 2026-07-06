import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '@/stores/session'
import { validatePasswordFields, type PasswordFieldErrors } from '@/utils/password-validation'
import { emitSfx } from '@/sfx/bus'

type FieldName = 'password' | 'confirm_password'

export type SubmitResult = 'success' | 'invalid' | 'error'

/**
 * New-password form state + submit action for the post-recovery reset-password
 * modal. The member is already signed in at this point — Supabase's recovery
 * flow authenticates the session before this modal ever opens — so this only
 * needs `updateUser({ password })`, same as the account-access password row.
 */
export function useResetPasswordActions() {
  const session = useSessionStore()
  const { t } = useI18n()

  const password = ref('')
  const confirm_password = ref('')
  const loading = ref(false)
  const errors = ref<PasswordFieldErrors>({})

  function validate(): boolean {
    const e = validatePasswordFields(password.value, confirm_password.value, {
      required: t('reset-password-modal.validation-required'),
      tooShort: t('reset-password-modal.validation-too-short'),
      confirmRequired: t('reset-password-modal.validation-confirm-required'),
      mismatch: t('reset-password-modal.validation-mismatch')
    })

    errors.value = e
    return Object.keys(e).length === 0
  }

  async function submit(): Promise<SubmitResult> {
    if (!validate()) {
      emitSfx('etc_woodblock_stuck')
      return 'invalid'
    }

    loading.value = true
    const outcome = await session.updatePassword(password.value)
    loading.value = false

    if (outcome === 'success') return 'success'

    emitSfx('etc_woodblock_stuck')

    if (outcome === 'weak-password') {
      errors.value = { ...errors.value, password: t('reset-password-modal.validation-weak') }
      return 'invalid'
    }

    // 'same-password' isn't meaningful here — there's no prior password to compare
    // against from the recovery flow's perspective — so it falls through to 'error'.
    return 'error'
  }

  function clearOnInput(field: FieldName) {
    if (!errors.value[field]) return

    const next = { ...errors.value }
    delete next[field]
    errors.value = next
  }

  watch(password, () => clearOnInput('password'))
  watch(confirm_password, () => clearOnInput('confirm_password'))

  return { password, confirm_password, loading, errors, submit }
}
