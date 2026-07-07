import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockEmitSfx, mockRequestPasswordReset } = vi.hoisted(() => ({
  mockEmitSfx: vi.fn(),
  mockRequestPasswordReset: vi.fn()
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitHoverSfx: vi.fn()
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key) => key })
}))

vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({ requestPasswordReset: mockRequestPasswordReset })
}))

import { useForgotPasswordActions } from '@/composables/auth/use-forgot-password-actions'

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  setActivePinia(createPinia())
  mockEmitSfx.mockReset()
  mockRequestPasswordReset.mockReset()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useForgotPasswordActions', () => {
  // ── all_filled ────────────────────────────────────────────────────────────

  describe('all_filled', () => {
    test('is false when email is empty', () => {
      const auth = useForgotPasswordActions()
      expect(auth.all_filled).toBe(false)
    })

    test('is false when email is only whitespace', () => {
      const auth = useForgotPasswordActions()
      auth.email = '   '
      expect(auth.all_filled).toBe(false)
    })

    test('is true when email is non-empty', () => {
      const auth = useForgotPasswordActions()
      auth.email = 'user@example.com'
      expect(auth.all_filled).toBe(true)
    })
  })

  // ── submit() — validation [obligation] ───────────────────────────────────

  describe('submit() — validation failure [obligation]', () => {
    test('returns "invalid" when email is empty [obligation]', async () => {
      const auth = useForgotPasswordActions()
      const result = await auth.submit()
      expect(result).toBe('invalid')
    })

    test('sets errors.email-required message when email is empty [obligation]', async () => {
      const auth = useForgotPasswordActions()
      await auth.submit()
      expect(auth.errors.email).toBe('forgot-password-modal.form-validation.email-required')
    })

    test('sets errors.email-invalid message when email is malformed [obligation]', async () => {
      const auth = useForgotPasswordActions()
      auth.email = 'not-an-email'
      await nextTick()
      await auth.submit()
      expect(auth.errors.email).toBe('forgot-password-modal.form-validation.email-invalid')
    })

    test('does NOT call session.requestPasswordReset when validation fails [obligation]', async () => {
      const auth = useForgotPasswordActions()
      await auth.submit()
      expect(mockRequestPasswordReset).not.toHaveBeenCalled()
    })

    test('emits digi_powerdown sfx on validation failure [obligation]', async () => {
      const auth = useForgotPasswordActions()
      await auth.submit()
      expect(mockEmitSfx).toHaveBeenCalledWith('digi_powerdown')
    })
  })

  // ── submit() — success [obligation] ──────────────────────────────────────

  describe('submit() — success [obligation]', () => {
    test('returns "success" and sets success=true when the outcome is "success" [obligation]', async () => {
      mockRequestPasswordReset.mockResolvedValueOnce('success')
      const auth = useForgotPasswordActions()
      auth.email = 'user@example.com'
      await nextTick()

      const result = await auth.submit()

      expect(result).toBe('success')
      expect(auth.success).toBe(true)
    })

    test('calls session.requestPasswordReset with a trimmed email', async () => {
      mockRequestPasswordReset.mockResolvedValueOnce('success')
      const auth = useForgotPasswordActions()
      auth.email = '  user@example.com  '
      await nextTick()

      await auth.submit()

      expect(mockRequestPasswordReset).toHaveBeenCalledWith('user@example.com')
    })
  })

  // ── submit() — error [obligation] ────────────────────────────────────────

  describe('submit() — error path (account-enumeration prevention) [obligation]', () => {
    test('returns "error" and shows the generic message on the "error" outcome [obligation]', async () => {
      mockRequestPasswordReset.mockResolvedValueOnce('error')
      const auth = useForgotPasswordActions()
      auth.email = 'user@example.com'
      await nextTick()

      const result = await auth.submit()

      expect(result).toBe('error')
      expect(auth.submitError).toBe('forgot-password-modal.errors.generic')
      expect(auth.success).toBe(false)
    })

    test('emits etc_woodblock_stuck sfx on error [obligation]', async () => {
      mockRequestPasswordReset.mockResolvedValueOnce('error')
      const auth = useForgotPasswordActions()
      auth.email = 'user@example.com'
      await nextTick()

      await auth.submit()

      expect(mockEmitSfx).toHaveBeenCalledWith('etc_woodblock_stuck')
    })
  })

  // ── clear-on-type ─────────────────────────────────────────────────────────

  describe('clear-on-type invariants', () => {
    test('typing in email clears errors.email', async () => {
      const auth = useForgotPasswordActions()
      await auth.submit()
      await nextTick()
      expect(auth.errors.email).toBeDefined()

      auth.email = 'user@example.com'
      await nextTick()
      expect(auth.errors.email).toBeUndefined()
    })

    test('typing in email clears submitError', async () => {
      mockRequestPasswordReset.mockResolvedValueOnce('error')
      const auth = useForgotPasswordActions()
      auth.email = 'user@example.com'
      await nextTick()
      await auth.submit()
      expect(auth.submitError).not.toBe('')

      auth.email = 'other@example.com'
      await nextTick()
      expect(auth.submitError).toBe('')
    })
  })
})
