import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '@/stores/session'
import { useNoticeStore } from '@/stores/notice-store'
import { validatePasswordFields, type PasswordFieldErrors } from '@/utils/password-validation'
import { emitSfx } from '@/sfx/bus'

type FieldName = 'password' | 'confirm_password' | 'current_password' | 'code'

type PasswordActionErrors = PasswordFieldErrors &
  Partial<Record<'current_password' | 'code', string>>

/** Which re-proof of identity the member is being asked for. */
export type PasswordStep = 'password' | 'code'

export type SubmitResult = 'success' | 'code-sent' | 'invalid' | 'error'

/**
 * New-password form state + submit action for the account-access modal's
 * password row, gated on re-proving identity so a walked-away-from tab isn't a
 * one-submit account takeover.
 *
 * Which proof is asked for depends on how the member signs in:
 * - has a password → re-enter it, verified before the change goes through.
 * - Google only → nothing to re-enter, so a one-time code is emailed and the
 *   form advances to a second step to collect it.
 */
export function usePasswordActions() {
  const session = useSessionStore()
  const notice = useNoticeStore()
  const { t } = useI18n()

  const password = ref('')
  const confirm_password = ref('')
  const current_password = ref('')
  const code = ref('')
  const step = ref<PasswordStep>('password')
  const loading = ref(false)
  const errors = ref<PasswordActionErrors>({})
  const success = ref(false)

  function validate(): boolean {
    const e: PasswordActionErrors = validatePasswordFields(password.value, confirm_password.value, {
      required: t('account-access-modal.password.validation-required'),
      tooShort: t('account-access-modal.password.validation-too-short'),
      confirmRequired: t('account-access-modal.password.validation-confirm-required'),
      mismatch: t('account-access-modal.password.validation-mismatch')
    })

    if (session.hasPassword && !current_password.value) {
      e.current_password = t('account-access-modal.password.validation-current-required')
    }

    errors.value = e
    return Object.keys(e).length === 0
  }

  function fail(field: FieldName, message: string): SubmitResult {
    emitSfx('notice.error')
    errors.value = { ...errors.value, [field]: message }
    return 'invalid'
  }

  /** Writes the new password once identity has been re-proved. */
  async function applyPassword(): Promise<SubmitResult> {
    const outcome = await session.updatePassword(password.value)

    if (outcome === 'success') {
      success.value = true
      password.value = ''
      confirm_password.value = ''
      current_password.value = ''
      code.value = ''
      return 'success'
    }

    if (outcome === 'weak-password') {
      return fail('password', t('account-access-modal.password.validation-weak'))
    }

    if (outcome === 'same-password') {
      return fail('password', t('account-access-modal.password.validation-same'))
    }

    emitSfx('notice.error')
    notice.error(t('account-access-modal.password.error'))
    return 'error'
  }

  /** Password-identity members: re-enter the current password, verified first. */
  async function verifyThenApply(): Promise<SubmitResult> {
    const outcome = await session.verifyPassword(current_password.value)

    if (outcome === 'invalid-credentials') {
      return fail('current_password', t('account-access-modal.password.validation-current-wrong'))
    }

    if (outcome === 'error') {
      emitSfx('notice.error')
      notice.error(t('account-access-modal.password.error'))
      return 'error'
    }

    return applyPassword()
  }

  /** Google-only members: email a one-time code and advance to the code step. */
  async function requestCode(): Promise<SubmitResult> {
    const outcome = await session.requestReauthCode()

    if (outcome === 'rate-limited') {
      emitSfx('notice.error')
      notice.error(t('account-access-modal.password.code-rate-limited'))
      return 'error'
    }

    if (outcome === 'error') {
      emitSfx('notice.error')
      notice.error(t('account-access-modal.password.code-request-error'))
      return 'error'
    }

    step.value = 'code'
    return 'code-sent'
  }

  async function submitCode(): Promise<SubmitResult> {
    if (!code.value) {
      return fail('code', t('account-access-modal.password.validation-code-required'))
    }

    const outcome = await session.verifyReauthCode(code.value)

    if (outcome === 'invalid-code') {
      return fail('code', t('account-access-modal.password.validation-code-invalid'))
    }

    if (outcome === 'error') {
      emitSfx('notice.error')
      notice.error(t('account-access-modal.password.error'))
      return 'error'
    }

    return applyPassword()
  }

  async function submit(): Promise<SubmitResult> {
    if (loading.value) return 'invalid'

    if (step.value === 'password' && !validate()) {
      emitSfx('notice.error')
      return 'invalid'
    }

    loading.value = true

    try {
      if (step.value === 'code') return await submitCode()
      if (session.hasPassword) return await verifyThenApply()
      return await requestCode()
    } finally {
      loading.value = false
    }
  }

  async function resendCode(): Promise<void> {
    if (loading.value) return

    loading.value = true
    const outcome = await session.requestReauthCode()
    loading.value = false

    if (outcome === 'success') {
      notice.success(t('account-access-modal.password.code-resent'))
      return
    }

    emitSfx('notice.error')
    notice.error(
      outcome === 'rate-limited'
        ? t('account-access-modal.password.code-rate-limited')
        : t('account-access-modal.password.code-request-error')
    )
  }

  function clearOnInput(field: FieldName) {
    if (!errors.value[field]) return

    const next = { ...errors.value }
    delete next[field]
    errors.value = next
  }

  watch(password, () => clearOnInput('password'))
  watch(confirm_password, () => clearOnInput('confirm_password'))
  watch(current_password, () => clearOnInput('current_password'))
  watch(code, () => clearOnInput('code'))

  // Returns plain refs, not reactive() — reactive() would unwrap them, so a caller destructuring this loses reactivity.
  return {
    password,
    confirm_password,
    current_password,
    code,
    step,
    loading,
    errors,
    success,
    submit,
    resendCode
  }
}
