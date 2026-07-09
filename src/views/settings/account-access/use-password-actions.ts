import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '@/stores/session'
import { useNoticeStore } from '@/stores/notice-store'
import { validatePasswordFields, type PasswordFieldErrors } from '@/utils/password-validation'
import { emitSfx } from '@/sfx/bus'

type FieldName = 'password' | 'confirm_password'

export type SubmitResult = 'success' | 'invalid' | 'error'

/**
 * New-password form state + submit action for the account-access modal's
 * password row. Works the same whether the member already has a password
 * (change) or only a Google identity (set) — Supabase's `updateUser` handles
 * both without a current-password field, since `secure_password_change` is
 * off for this project.
 */
export function usePasswordActions() {
  const session = useSessionStore()
  const notice = useNoticeStore()
  const { t } = useI18n()

  const password = ref('')
  const confirm_password = ref('')
  const loading = ref(false)
  const errors = ref<PasswordFieldErrors>({})
  const success = ref(false)

  function validate(): boolean {
    const e = validatePasswordFields(password.value, confirm_password.value, {
      required: t('account-access-modal.password.validation-required'),
      tooShort: t('account-access-modal.password.validation-too-short'),
      confirmRequired: t('account-access-modal.password.validation-confirm-required'),
      mismatch: t('account-access-modal.password.validation-mismatch')
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

    if (outcome === 'success') {
      success.value = true
      password.value = ''
      confirm_password.value = ''
      return 'success'
    }

    emitSfx('etc_woodblock_stuck')

    if (outcome === 'weak-password') {
      errors.value = {
        ...errors.value,
        password: t('account-access-modal.password.validation-weak')
      }
      return 'invalid'
    }

    if (outcome === 'same-password') {
      errors.value = {
        ...errors.value,
        password: t('account-access-modal.password.validation-same')
      }
      return 'invalid'
    }

    notice.error(t('account-access-modal.password.error'))
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

  // Plain object of refs, not reactive() — a consumer destructuring this
  // (`const { password } = usePasswordActions()`) needs the actual Ref object
  // to stay reactive; reactive() would unwrap it to a frozen snapshot value.
  return { password, confirm_password, loading, errors, success, submit }
}
