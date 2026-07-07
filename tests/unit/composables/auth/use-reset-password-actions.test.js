import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockEmitSfx, mockUpdatePassword } = vi.hoisted(() => ({
  mockEmitSfx: vi.fn(),
  mockUpdatePassword: vi.fn()
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitHoverSfx: vi.fn()
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key) => key })
}))

vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({ updatePassword: mockUpdatePassword })
}))

import { useResetPasswordActions } from '@/composables/auth/use-reset-password-actions'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fillValidFields(auth) {
  auth.password.value = 'hunter2222'
  auth.confirm_password.value = 'hunter2222'
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  setActivePinia(createPinia())
  mockEmitSfx.mockReset()
  mockUpdatePassword.mockReset()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useResetPasswordActions', () => {
  // ── submit() — validation failure ────────────────────────────────────────

  describe('submit() — validation failure', () => {
    test('returns "invalid" when fields are empty', async () => {
      const auth = useResetPasswordActions()
      const result = await auth.submit()
      expect(result).toBe('invalid')
    })

    test('does NOT call session.updatePassword when validation fails', async () => {
      const auth = useResetPasswordActions()
      await auth.submit()
      expect(mockUpdatePassword).not.toHaveBeenCalled()
    })

    test('emits etc_woodblock_stuck sfx on validation failure', async () => {
      const auth = useResetPasswordActions()
      await auth.submit()
      expect(mockEmitSfx).toHaveBeenCalledWith('etc_woodblock_stuck')
    })

    test('sets errors.password when password is empty', async () => {
      const auth = useResetPasswordActions()
      await auth.submit()
      expect(auth.errors.value.password).toBe('reset-password-modal.validation-required')
    })

    test('sets errors.confirm_password when passwords do not match', async () => {
      const auth = useResetPasswordActions()
      auth.password.value = 'hunter2222'
      auth.confirm_password.value = 'somethingelse'
      await nextTick()
      await auth.submit()
      expect(auth.errors.value.confirm_password).toBe('reset-password-modal.validation-mismatch')
    })
  })

  // ── submit() — success ────────────────────────────────────────────────────

  describe('submit() — success', () => {
    test('returns "success" and sets success=true when updatePassword resolves "success"', async () => {
      mockUpdatePassword.mockResolvedValueOnce('success')
      const auth = useResetPasswordActions()
      fillValidFields(auth)
      await nextTick()

      const result = await auth.submit()

      expect(result).toBe('success')
      expect(auth.success.value).toBe(true)
    })

    test('calls session.updatePassword with the password', async () => {
      mockUpdatePassword.mockResolvedValueOnce('success')
      const auth = useResetPasswordActions()
      fillValidFields(auth)
      await nextTick()

      await auth.submit()

      expect(mockUpdatePassword).toHaveBeenCalledWith('hunter2222')
    })
  })

  // ── submit() — weak-password outcome [obligation] ────────────────────────

  describe('submit() — weak-password outcome [obligation]', () => {
    test('maps "weak-password" to an inline errors.password message and returns "invalid" [obligation]', async () => {
      mockUpdatePassword.mockResolvedValueOnce('weak-password')
      const auth = useResetPasswordActions()
      fillValidFields(auth)
      await nextTick()

      const result = await auth.submit()

      expect(result).toBe('invalid')
      expect(auth.errors.value.password).toBe('reset-password-modal.validation-weak')
    })

    test('emits etc_woodblock_stuck sfx on weak-password [obligation]', async () => {
      mockUpdatePassword.mockResolvedValueOnce('weak-password')
      const auth = useResetPasswordActions()
      fillValidFields(auth)
      await nextTick()

      await auth.submit()

      expect(mockEmitSfx).toHaveBeenCalledWith('etc_woodblock_stuck')
    })
  })

  // ── submit() — same-password outcome [obligation] ────────────────────────

  describe('submit() — same-password outcome deliberately falls through to "error" [obligation]', () => {
    test('returns "error" (not "invalid") for the "same-password" outcome [obligation]', async () => {
      mockUpdatePassword.mockResolvedValueOnce('same-password')
      const auth = useResetPasswordActions()
      fillValidFields(auth)
      await nextTick()

      const result = await auth.submit()

      expect(result).toBe('error')
    })

    test('does NOT set an inline errors.password message for "same-password" [obligation]', async () => {
      mockUpdatePassword.mockResolvedValueOnce('same-password')
      const auth = useResetPasswordActions()
      fillValidFields(auth)
      await nextTick()

      await auth.submit()

      expect(auth.errors.value.password).toBeUndefined()
    })

    test('leaves success false for "same-password" [obligation]', async () => {
      mockUpdatePassword.mockResolvedValueOnce('same-password')
      const auth = useResetPasswordActions()
      fillValidFields(auth)
      await nextTick()

      await auth.submit()

      expect(auth.success.value).toBe(false)
    })
  })

  // ── submit() — generic error ─────────────────────────────────────────────

  describe('submit() — generic error', () => {
    test('returns "error" for any other backend outcome', async () => {
      mockUpdatePassword.mockResolvedValueOnce('error')
      const auth = useResetPasswordActions()
      fillValidFields(auth)
      await nextTick()

      const result = await auth.submit()

      expect(result).toBe('error')
    })
  })

  // ── clear-on-type ─────────────────────────────────────────────────────────

  describe('clear-on-type invariants', () => {
    test('typing in password clears errors.password', async () => {
      const auth = useResetPasswordActions()
      await auth.submit()
      await nextTick()
      expect(auth.errors.value.password).toBeDefined()

      auth.password.value = 'hunter2222'
      await nextTick()
      expect(auth.errors.value.password).toBeUndefined()
    })

    test('typing in confirm_password clears errors.confirm_password', async () => {
      const auth = useResetPasswordActions()
      await auth.submit()
      await nextTick()
      expect(auth.errors.value.confirm_password).toBeDefined()

      auth.confirm_password.value = 'hunter2222'
      await nextTick()
      expect(auth.errors.value.confirm_password).toBeUndefined()
    })

    test('typing in password does NOT clear errors.confirm_password', async () => {
      const auth = useResetPasswordActions()
      await auth.submit()
      await nextTick()
      expect(auth.errors.value.confirm_password).toBeDefined()

      auth.password.value = 'hunter2222'
      await nextTick()
      expect(auth.errors.value.confirm_password).toBeDefined()
    })
  })
})
