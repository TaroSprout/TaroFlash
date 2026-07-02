import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '@/stores/session'

export type SubmitResult = 'success' | 'invalid' | 'error'

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
}

/**
 * New-email form state + submit action for the account-access modal's email
 * row. `submit()` returning 'success' means Supabase sent confirmation links
 * to both the old and new address — the email doesn't actually change until
 * both are confirmed, so the section shows a pending message rather than a
 * new value.
 */
export function useEmailActions() {
  const session = useSessionStore()
  const { t } = useI18n()

  const email = ref(session.user?.email ?? '')
  const loading = ref(false)
  const error = ref('')
  const pending = ref(false)

  function validate(): boolean {
    const current = session.user?.email
    const next = email.value.trim()

    if (!next) error.value = t('account-access-modal.email.validation-required')
    else if (!isEmail(next)) error.value = t('account-access-modal.email.validation-invalid')
    else if (next === current) error.value = t('account-access-modal.email.validation-unchanged')
    else error.value = ''

    return !error.value
  }

  async function submit(): Promise<SubmitResult> {
    if (!validate()) return 'invalid'

    loading.value = true
    const outcome = await session.updateEmail(email.value.trim())
    loading.value = false

    if (outcome === 'success') {
      pending.value = true
      return 'success'
    }

    if (outcome === 'email-taken') {
      error.value = t('account-access-modal.email.validation-taken')
      return 'invalid'
    }

    return 'error'
  }

  watch(email, () => (error.value = ''))

  return { email, loading, error, pending, submit }
}
