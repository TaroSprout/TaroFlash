import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { nextTick } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockSession, mockEmitSfx } = vi.hoisted(() => ({
  mockSession: { updatePassword: vi.fn() },
  mockEmitSfx: vi.fn()
}))

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k) => k }) }))
vi.mock('@/stores/session', () => ({ useSessionStore: () => mockSession }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

import { usePasswordActions } from '@/components/settings/account-access/use-password-actions'

beforeEach(() => {
  mockSession.updatePassword.mockReset()
  mockEmitSfx.mockReset()
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
    expect(mockEmitSfx).toHaveBeenCalledWith('etc_woodblock_stuck')
  })
})

describe('usePasswordActions — submit', () => {
  test('"success" sets success true and clears both fields', async () => {
    mockSession.updatePassword.mockResolvedValueOnce('success')
    const password_actions = usePasswordActions()
    password_actions.password.value = 'longenough1'
    password_actions.confirm_password.value = 'longenough1'

    const result = await password_actions.submit()

    expect(result).toBe('success')
    expect(password_actions.success.value).toBe(true)
    expect(password_actions.password.value).toBe('')
    expect(password_actions.confirm_password.value).toBe('')
  })

  test('[obligation] does not play the stuck sfx on a successful submit', async () => {
    mockSession.updatePassword.mockResolvedValueOnce('success')
    const password_actions = usePasswordActions()
    password_actions.password.value = 'longenough1'
    password_actions.confirm_password.value = 'longenough1'

    await password_actions.submit()

    expect(mockEmitSfx).not.toHaveBeenCalled()
  })

  test('maps the "weak-password" outcome to an inline error on the password field', async () => {
    mockSession.updatePassword.mockResolvedValueOnce('weak-password')
    const password_actions = usePasswordActions()
    password_actions.password.value = 'longenough1'
    password_actions.confirm_password.value = 'longenough1'

    const result = await password_actions.submit()

    expect(result).toBe('invalid')
    expect(password_actions.errors.value.password).toBe(
      'account-access-modal.password.validation-weak'
    )
  })

  test('[obligation] maps the "same-password" outcome to an inline error on the password field', async () => {
    mockSession.updatePassword.mockResolvedValueOnce('same-password')
    const password_actions = usePasswordActions()
    password_actions.password.value = 'longenough1'
    password_actions.confirm_password.value = 'longenough1'

    const result = await password_actions.submit()

    expect(result).toBe('invalid')
    expect(password_actions.errors.value.password).toBe(
      'account-access-modal.password.validation-same'
    )
  })

  test('returns "error" for any other outcome', async () => {
    mockSession.updatePassword.mockResolvedValueOnce('error')
    const password_actions = usePasswordActions()
    password_actions.password.value = 'longenough1'
    password_actions.confirm_password.value = 'longenough1'

    const result = await password_actions.submit()

    expect(result).toBe('error')
  })

  test('[obligation] plays the stuck sfx for every non-success server outcome', async () => {
    for (const outcome of ['weak-password', 'same-password', 'error']) {
      mockEmitSfx.mockReset()
      mockSession.updatePassword.mockResolvedValueOnce(outcome)
      const password_actions = usePasswordActions()
      password_actions.password.value = 'longenough1'
      password_actions.confirm_password.value = 'longenough1'

      await password_actions.submit()

      expect(mockEmitSfx).toHaveBeenCalledWith('etc_woodblock_stuck')
    }
  })

  test('toggles loading around the submit call', async () => {
    let resolveUpdate
    mockSession.updatePassword.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveUpdate = resolve
      })
    )
    const password_actions = usePasswordActions()
    password_actions.password.value = 'longenough1'
    password_actions.confirm_password.value = 'longenough1'

    const promise = password_actions.submit()
    expect(password_actions.loading.value).toBe(true)

    resolveUpdate('success')
    await promise

    expect(password_actions.loading.value).toBe(false)
  })
})
