import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { nextTick } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockSession, mockEmitSfx } = vi.hoisted(() => ({
  mockSession: {
    hasPassword: false,
    updatePassword: vi.fn(),
    verifyPassword: vi.fn(),
    requestReauthCode: vi.fn(),
    verifyReauthCode: vi.fn()
  },
  mockEmitSfx: vi.fn()
}))

const { mockNotice } = vi.hoisted(() => ({
  mockNotice: { error: vi.fn(), success: vi.fn(), warn: vi.fn() }
}))

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k) => k }) }))
vi.mock('@/stores/session', () => ({ useSessionStore: () => mockSession }))
vi.mock('@/stores/notice-store', () => ({ useNoticeStore: () => mockNotice }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

import { usePasswordActions } from '@/views/settings/account-access/use-password-actions'

beforeEach(() => {
  mockSession.hasPassword = false
  mockSession.updatePassword.mockReset()
  mockSession.verifyPassword.mockReset()
  mockSession.requestReauthCode.mockReset()
  mockSession.verifyReauthCode.mockReset()
  mockEmitSfx.mockReset()
  mockNotice.error.mockReset()
  mockNotice.success.mockReset()
})

describe('usePasswordActions — validation', () => {
  test('requires a password', async () => {
    const password_actions = usePasswordActions()
    password_actions.confirm_password.value = 'x'
    const result = await password_actions.submit()
    expect(result).toBe('invalid')
    expect(password_actions.errors.value.password).toBe(
      'account-access-modal.password.validation-required'
    )
  })

  test('rejects a password shorter than 8 characters', async () => {
    const password_actions = usePasswordActions()
    password_actions.password.value = 'short'
    password_actions.confirm_password.value = 'short'
    // Let the pre-flush error-clearing watchers settle before submit runs, so
    // they don't race with (and wipe) the errors validate() is about to set.
    await nextTick()
    const result = await password_actions.submit()
    expect(result).toBe('invalid')
    expect(password_actions.errors.value.password).toBe(
      'account-access-modal.password.validation-too-short'
    )
  })

  test('requires a confirmation value', async () => {
    const password_actions = usePasswordActions()
    password_actions.password.value = 'longenough1'
    const result = await password_actions.submit()
    expect(result).toBe('invalid')
    expect(password_actions.errors.value.confirm_password).toBe(
      'account-access-modal.password.validation-confirm-required'
    )
  })

  test('rejects a mismatched confirmation', async () => {
    const password_actions = usePasswordActions()
    password_actions.password.value = 'longenough1'
    password_actions.confirm_password.value = 'different1'
    await nextTick()
    const result = await password_actions.submit()
    expect(result).toBe('invalid')
    expect(password_actions.errors.value.confirm_password).toBe(
      'account-access-modal.password.validation-mismatch'
    )
  })

  test('requires the current password field when the member has a password', async () => {
    mockSession.hasPassword = true
    const password_actions = usePasswordActions()
    password_actions.password.value = 'longenough1'
    password_actions.confirm_password.value = 'longenough1'
    await nextTick()

    const result = await password_actions.submit()

    expect(result).toBe('invalid')
    expect(password_actions.errors.value.current_password).toBe(
      'account-access-modal.password.validation-current-required'
    )
    expect(mockSession.verifyPassword).not.toHaveBeenCalled()
  })

  test('clears the password field error as soon as it is edited', async () => {
    const password_actions = usePasswordActions()
    await password_actions.submit()
    expect(password_actions.errors.value.password).toBeTruthy()

    password_actions.password.value = 'longenough1'
    await Promise.resolve()
    expect(password_actions.errors.value.password).toBeUndefined()
  })

  test('[obligation] plays the stuck sfx when client-side validation fails', async () => {
    const password_actions = usePasswordActions()
    await password_actions.submit()
    expect(mockEmitSfx).toHaveBeenCalledWith('notice.error')
  })

  test('[obligation] does NOT fire a notice-store error for a validation failure', async () => {
    const password_actions = usePasswordActions()
    await password_actions.submit()
    expect(mockNotice.error).not.toHaveBeenCalled()
  })
})

describe('usePasswordActions — submit ignores re-entry while loading [obligation]', () => {
  test('[obligation] a second submit() call while the first is in flight is a no-op', async () => {
    let resolveVerify
    mockSession.hasPassword = true
    mockSession.verifyPassword.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveVerify = resolve
      })
    )
    const password_actions = usePasswordActions()
    password_actions.password.value = 'longenough1'
    password_actions.confirm_password.value = 'longenough1'
    password_actions.current_password.value = 'currentpw1'
    await nextTick()

    const first = password_actions.submit()
    const second = await password_actions.submit()

    expect(second).toBe('invalid')
    expect(mockSession.verifyPassword).toHaveBeenCalledOnce()

    resolveVerify('success')
    await first
  })
})

describe('usePasswordActions — current-password branch (session.hasPassword) [obligation]', () => {
  test('[obligation] verifies the current password before applying the change', async () => {
    mockSession.hasPassword = true
    mockSession.verifyPassword.mockResolvedValueOnce('success')
    mockSession.updatePassword.mockResolvedValueOnce('success')
    const password_actions = usePasswordActions()
    password_actions.password.value = 'longenough1'
    password_actions.confirm_password.value = 'longenough1'
    password_actions.current_password.value = 'currentpw1'
    await nextTick()

    const result = await password_actions.submit()

    expect(mockSession.verifyPassword).toHaveBeenCalledWith('currentpw1')
    expect(mockSession.updatePassword).toHaveBeenCalledWith('longenough1')
    expect(result).toBe('success')
  })

  test('wrong current password: updatePassword is never called, error lands on current_password [obligation]', async () => {
    mockSession.hasPassword = true
    mockSession.verifyPassword.mockResolvedValueOnce('invalid-credentials')
    const password_actions = usePasswordActions()
    password_actions.password.value = 'longenough1'
    password_actions.confirm_password.value = 'longenough1'
    password_actions.current_password.value = 'wrongpw1'
    await nextTick()

    const result = await password_actions.submit()

    expect(result).toBe('invalid')
    expect(password_actions.errors.value.current_password).toBe(
      'account-access-modal.password.validation-current-wrong'
    )
    expect(mockSession.updatePassword).not.toHaveBeenCalled()
  })

  test('verifyPassword "error" outcome fires the generic notice and does not call updatePassword', async () => {
    mockSession.hasPassword = true
    mockSession.verifyPassword.mockResolvedValueOnce('error')
    const password_actions = usePasswordActions()
    password_actions.password.value = 'longenough1'
    password_actions.confirm_password.value = 'longenough1'
    password_actions.current_password.value = 'currentpw1'
    await nextTick()

    const result = await password_actions.submit()

    expect(result).toBe('error')
    expect(mockNotice.error).toHaveBeenCalledWith('account-access-modal.password.error')
    expect(mockSession.updatePassword).not.toHaveBeenCalled()
  })
})

describe('usePasswordActions — Google-only two-step flow [obligation]', () => {
  test('[obligation] first submit only requests a code and advances step to "code" — does not call updatePassword', async () => {
    mockSession.hasPassword = false
    mockSession.requestReauthCode.mockResolvedValueOnce('success')
    const password_actions = usePasswordActions()
    password_actions.password.value = 'longenough1'
    password_actions.confirm_password.value = 'longenough1'
    await nextTick()

    const result = await password_actions.submit()

    expect(result).toBe('code-sent')
    expect(password_actions.step.value).toBe('code')
    expect(mockSession.updatePassword).not.toHaveBeenCalled()
  })

  test('requestCode "rate-limited" outcome shows the rate-limit notice and stays on the password step', async () => {
    mockSession.hasPassword = false
    mockSession.requestReauthCode.mockResolvedValueOnce('rate-limited')
    const password_actions = usePasswordActions()
    password_actions.password.value = 'longenough1'
    password_actions.confirm_password.value = 'longenough1'
    await nextTick()

    const result = await password_actions.submit()

    expect(result).toBe('error')
    expect(password_actions.step.value).toBe('password')
    expect(mockNotice.error).toHaveBeenCalledWith('account-access-modal.password.code-rate-limited')
  })

  test('requestCode "error" outcome shows the code-request-error notice', async () => {
    mockSession.hasPassword = false
    mockSession.requestReauthCode.mockResolvedValueOnce('error')
    const password_actions = usePasswordActions()
    password_actions.password.value = 'longenough1'
    password_actions.confirm_password.value = 'longenough1'
    await nextTick()

    await password_actions.submit()

    expect(mockNotice.error).toHaveBeenCalledWith(
      'account-access-modal.password.code-request-error'
    )
  })

  test('[obligation] second submit verifies the code, then changes the password', async () => {
    mockSession.hasPassword = false
    mockSession.requestReauthCode.mockResolvedValueOnce('success')
    mockSession.verifyReauthCode.mockResolvedValueOnce('success')
    mockSession.updatePassword.mockResolvedValueOnce('success')
    const password_actions = usePasswordActions()
    password_actions.password.value = 'longenough1'
    password_actions.confirm_password.value = 'longenough1'
    await nextTick()
    await password_actions.submit()

    password_actions.code.value = '123456'
    const result = await password_actions.submit()

    expect(mockSession.verifyReauthCode).toHaveBeenCalledWith('123456')
    expect(mockSession.updatePassword).toHaveBeenCalledWith('longenough1')
    expect(result).toBe('success')
  })

  test('empty code on the code step fails validation without calling verifyReauthCode', async () => {
    mockSession.hasPassword = false
    mockSession.requestReauthCode.mockResolvedValueOnce('success')
    const password_actions = usePasswordActions()
    password_actions.password.value = 'longenough1'
    password_actions.confirm_password.value = 'longenough1'
    await nextTick()
    await password_actions.submit()

    const result = await password_actions.submit()

    expect(result).toBe('invalid')
    expect(password_actions.errors.value.code).toBe(
      'account-access-modal.password.validation-code-required'
    )
    expect(mockSession.verifyReauthCode).not.toHaveBeenCalled()
  })

  test('[obligation] wrong/expired code sets an error on the code field and preserves the typed new password', async () => {
    mockSession.hasPassword = false
    mockSession.requestReauthCode.mockResolvedValueOnce('success')
    mockSession.verifyReauthCode.mockResolvedValueOnce('invalid-code')
    const password_actions = usePasswordActions()
    password_actions.password.value = 'longenough1'
    password_actions.confirm_password.value = 'longenough1'
    await nextTick()
    await password_actions.submit()

    password_actions.code.value = 'wrong1'
    const result = await password_actions.submit()

    expect(result).toBe('invalid')
    expect(password_actions.errors.value.code).toBe(
      'account-access-modal.password.validation-code-invalid'
    )
    expect(password_actions.password.value).toBe('longenough1')
    expect(password_actions.confirm_password.value).toBe('longenough1')
    expect(mockSession.updatePassword).not.toHaveBeenCalled()
  })

  test('verifyReauthCode "error" outcome fires the generic notice', async () => {
    mockSession.hasPassword = false
    mockSession.requestReauthCode.mockResolvedValueOnce('success')
    mockSession.verifyReauthCode.mockResolvedValueOnce('error')
    const password_actions = usePasswordActions()
    password_actions.password.value = 'longenough1'
    password_actions.confirm_password.value = 'longenough1'
    await nextTick()
    await password_actions.submit()

    password_actions.code.value = '123456'
    const result = await password_actions.submit()

    expect(result).toBe('error')
    expect(mockNotice.error).toHaveBeenCalledWith('account-access-modal.password.error')
  })
})

describe('usePasswordActions — resendCode [obligation]', () => {
  test('is a no-op while loading is true', async () => {
    mockSession.hasPassword = false
    let resolveRequest
    mockSession.requestReauthCode.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve
      })
    )
    const password_actions = usePasswordActions()
    password_actions.password.value = 'longenough1'
    password_actions.confirm_password.value = 'longenough1'
    await nextTick()

    const submitPromise = password_actions.submit()
    await password_actions.resendCode()

    expect(mockSession.requestReauthCode).toHaveBeenCalledOnce()

    resolveRequest('success')
    await submitPromise
  })

  test('shows a success notice on "success"', async () => {
    mockSession.requestReauthCode.mockResolvedValueOnce('success')
    const password_actions = usePasswordActions()

    await password_actions.resendCode()

    expect(mockNotice.success).toHaveBeenCalledWith('account-access-modal.password.code-resent')
  })

  test('shows the rate-limit notice on "rate-limited"', async () => {
    mockSession.requestReauthCode.mockResolvedValueOnce('rate-limited')
    const password_actions = usePasswordActions()

    await password_actions.resendCode()

    expect(mockNotice.error).toHaveBeenCalledWith('account-access-modal.password.code-rate-limited')
  })

  test('shows the code-request-error notice on "error"', async () => {
    mockSession.requestReauthCode.mockResolvedValueOnce('error')
    const password_actions = usePasswordActions()

    await password_actions.resendCode()

    expect(mockNotice.error).toHaveBeenCalledWith(
      'account-access-modal.password.code-request-error'
    )
  })
})

describe('usePasswordActions — submit (current-password branch success/outcomes)', () => {
  test('"success" sets success true and clears all fields', async () => {
    mockSession.hasPassword = true
    mockSession.verifyPassword.mockResolvedValueOnce('success')
    mockSession.updatePassword.mockResolvedValueOnce('success')
    const password_actions = usePasswordActions()
    password_actions.password.value = 'longenough1'
    password_actions.confirm_password.value = 'longenough1'
    password_actions.current_password.value = 'currentpw1'
    await nextTick()

    const result = await password_actions.submit()

    expect(result).toBe('success')
    expect(password_actions.success.value).toBe(true)
    expect(password_actions.password.value).toBe('')
    expect(password_actions.confirm_password.value).toBe('')
    expect(password_actions.current_password.value).toBe('')
    expect(password_actions.code.value).toBe('')
  })

  test('[obligation] does not play the stuck sfx on a successful submit', async () => {
    mockSession.hasPassword = true
    mockSession.verifyPassword.mockResolvedValueOnce('success')
    mockSession.updatePassword.mockResolvedValueOnce('success')
    const password_actions = usePasswordActions()
    password_actions.password.value = 'longenough1'
    password_actions.confirm_password.value = 'longenough1'
    password_actions.current_password.value = 'currentpw1'
    await nextTick()

    await password_actions.submit()

    expect(mockEmitSfx).not.toHaveBeenCalled()
  })

  test('maps the "weak-password" outcome to an inline error on the password field', async () => {
    mockSession.hasPassword = true
    mockSession.verifyPassword.mockResolvedValueOnce('success')
    mockSession.updatePassword.mockResolvedValueOnce('weak-password')
    const password_actions = usePasswordActions()
    password_actions.password.value = 'longenough1'
    password_actions.confirm_password.value = 'longenough1'
    password_actions.current_password.value = 'currentpw1'
    await nextTick()

    const result = await password_actions.submit()

    expect(result).toBe('invalid')
    expect(password_actions.errors.value.password).toBe(
      'account-access-modal.password.validation-weak'
    )
  })

  test('[obligation] maps the "same-password" outcome to an inline error on the password field', async () => {
    mockSession.hasPassword = true
    mockSession.verifyPassword.mockResolvedValueOnce('success')
    mockSession.updatePassword.mockResolvedValueOnce('same-password')
    const password_actions = usePasswordActions()
    password_actions.password.value = 'longenough1'
    password_actions.confirm_password.value = 'longenough1'
    password_actions.current_password.value = 'currentpw1'
    await nextTick()

    const result = await password_actions.submit()

    expect(result).toBe('invalid')
    expect(password_actions.errors.value.password).toBe(
      'account-access-modal.password.validation-same'
    )
  })

  test('[obligation] does NOT fire a notice-store error for the "same-password" outcome', async () => {
    mockSession.hasPassword = true
    mockSession.verifyPassword.mockResolvedValueOnce('success')
    mockSession.updatePassword.mockResolvedValueOnce('same-password')
    const password_actions = usePasswordActions()
    password_actions.password.value = 'longenough1'
    password_actions.confirm_password.value = 'longenough1'
    password_actions.current_password.value = 'currentpw1'
    await nextTick()

    await password_actions.submit()

    expect(mockNotice.error).not.toHaveBeenCalled()
  })

  test('returns "error" for any other outcome', async () => {
    mockSession.hasPassword = true
    mockSession.verifyPassword.mockResolvedValueOnce('success')
    mockSession.updatePassword.mockResolvedValueOnce('error')
    const password_actions = usePasswordActions()
    password_actions.password.value = 'longenough1'
    password_actions.confirm_password.value = 'longenough1'
    password_actions.current_password.value = 'currentpw1'
    await nextTick()

    const result = await password_actions.submit()

    expect(result).toBe('error')
  })

  test('[obligation] fires a notice-store error only on the true fallthrough "error" outcome', async () => {
    mockSession.hasPassword = true
    mockSession.verifyPassword.mockResolvedValueOnce('success')
    mockSession.updatePassword.mockResolvedValueOnce('error')
    const password_actions = usePasswordActions()
    password_actions.password.value = 'longenough1'
    password_actions.confirm_password.value = 'longenough1'
    password_actions.current_password.value = 'currentpw1'
    await nextTick()

    await password_actions.submit()

    expect(mockNotice.error).toHaveBeenCalledWith('account-access-modal.password.error')
  })

  test('[obligation] plays the stuck sfx for every non-success server outcome', async () => {
    for (const outcome of ['weak-password', 'same-password', 'error']) {
      mockEmitSfx.mockReset()
      mockSession.hasPassword = true
      mockSession.verifyPassword.mockResolvedValueOnce('success')
      mockSession.updatePassword.mockResolvedValueOnce(outcome)
      const password_actions = usePasswordActions()
      password_actions.password.value = 'longenough1'
      password_actions.confirm_password.value = 'longenough1'
      password_actions.current_password.value = 'currentpw1'
      await nextTick()

      await password_actions.submit()

      expect(mockEmitSfx).toHaveBeenCalledWith('notice.error')
    }
  })

  test('toggles loading around the submit call', async () => {
    mockSession.hasPassword = true
    mockSession.verifyPassword.mockResolvedValueOnce('success')
    let resolveUpdate
    mockSession.updatePassword.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveUpdate = resolve
      })
    )
    const password_actions = usePasswordActions()
    password_actions.password.value = 'longenough1'
    password_actions.confirm_password.value = 'longenough1'
    password_actions.current_password.value = 'currentpw1'
    await nextTick()

    const promise = password_actions.submit()
    expect(password_actions.loading.value).toBe(true)

    resolveUpdate('success')
    await promise

    expect(password_actions.loading.value).toBe(false)
  })
})
