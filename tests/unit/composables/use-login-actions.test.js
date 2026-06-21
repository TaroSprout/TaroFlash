import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockEmitSfx, mockLogin, mockSignInOAuth } = vi.hoisted(() => ({
  mockEmitSfx: vi.fn(),
  mockLogin: vi.fn(),
  mockSignInOAuth: vi.fn()
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitHoverSfx: vi.fn()
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key) => key })
}))

vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({ login: mockLogin, signInOAuth: mockSignInOAuth })
}))

import { useLoginActions } from '@/composables/auth/use-login-actions'

// ── Helpers ────────────────────────────────────────────────────────────────────

function fillValidFields(auth) {
  auth.email = 'user@example.com'
  auth.password = 'password1'
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  setActivePinia(createPinia())
  mockEmitSfx.mockReset()
  mockLogin.mockReset()
})

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useLoginActions', () => {
  // ── all_filled [obligation] ─────────────────────────────────────────────────

  describe('all_filled', () => {
    test('is false when both fields are empty [obligation]', () => {
      const auth = useLoginActions()
      expect(auth.all_filled).toBe(false)
    })

    test('is false when only email is filled [obligation]', () => {
      const auth = useLoginActions()
      auth.email = 'user@example.com'
      expect(auth.all_filled).toBe(false)
    })

    test('is false when only password is filled [obligation]', () => {
      const auth = useLoginActions()
      auth.password = 'password1'
      expect(auth.all_filled).toBe(false)
    })

    test('is true when both email and password are non-empty [obligation]', () => {
      const auth = useLoginActions()
      fillValidFields(auth)
      expect(auth.all_filled).toBe(true)
    })

    test('is false when email is only whitespace [obligation]', () => {
      const auth = useLoginActions()
      auth.email = '   '
      auth.password = 'password1'
      expect(auth.all_filled).toBe(false)
    })
  })

  // ── submit() — invalid path [obligation] ────────────────────────────────────

  describe('submit() — validation failure', () => {
    test('returns "invalid" when fields are empty [obligation]', async () => {
      const auth = useLoginActions()
      const result = await auth.submit()
      expect(result).toBe('invalid')
    })

    test('does NOT call session.login when validation fails [obligation]', async () => {
      const auth = useLoginActions()
      await auth.submit()
      expect(mockLogin).not.toHaveBeenCalled()
    })

    test('emits digi_powerdown sfx on validation failure [obligation]', async () => {
      const auth = useLoginActions()
      await auth.submit()
      expect(mockEmitSfx).toHaveBeenCalledWith('digi_powerdown')
    })

    test('sets errors.email when email is empty', async () => {
      const auth = useLoginActions()
      auth.password = 'password1'
      await nextTick()
      await auth.submit()
      expect(auth.errors.email).toBeDefined()
    })

    test('sets errors.email when email is invalid format', async () => {
      const auth = useLoginActions()
      auth.email = 'not-an-email'
      auth.password = 'password1'
      await nextTick()
      await auth.submit()
      expect(auth.errors.email).toBeDefined()
    })

    test('sets errors.password when password is empty', async () => {
      const auth = useLoginActions()
      auth.email = 'user@example.com'
      await nextTick()
      await auth.submit()
      expect(auth.errors.password).toBeDefined()
    })

    test('returns "invalid" without emitting woodblock when fields invalid [obligation]', async () => {
      const auth = useLoginActions()
      await auth.submit()
      expect(mockEmitSfx).not.toHaveBeenCalledWith('etc_woodblock_stuck')
    })
  })

  // ── submit() — success path [obligation] ────────────────────────────────────

  describe('submit() — success', () => {
    test('returns "success" when session.login resolves "success" [obligation]', async () => {
      mockLogin.mockResolvedValueOnce('success')
      const auth = useLoginActions()
      fillValidFields(auth)
      await nextTick()
      const result = await auth.submit()
      expect(result).toBe('success')
    })

    test('calls session.login with trimmed email and password', async () => {
      mockLogin.mockResolvedValueOnce('success')
      const auth = useLoginActions()
      auth.email = '  user@example.com  '
      auth.password = 'password1'
      await nextTick()
      await auth.submit()
      expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'password1')
    })

    test('does not emit sfx or set submitError on success', async () => {
      mockLogin.mockResolvedValueOnce('success')
      const auth = useLoginActions()
      fillValidFields(auth)
      await nextTick()
      await auth.submit()
      expect(mockEmitSfx).not.toHaveBeenCalledWith('etc_woodblock_stuck')
      expect(auth.submitError).toBe('')
    })
  })

  // ── submit() — backend error paths [obligation] ─────────────────────────────

  describe('submit() — backend non-success', () => {
    test('returns "error" when session.login resolves non-success [obligation]', async () => {
      mockLogin.mockResolvedValueOnce('invalid-credentials')
      const auth = useLoginActions()
      fillValidFields(auth)
      await nextTick()
      const result = await auth.submit()
      expect(result).toBe('error')
    })

    test('sets submitError to the mapped message on non-success [obligation]', async () => {
      mockLogin.mockResolvedValueOnce('invalid-credentials')
      const auth = useLoginActions()
      fillValidFields(auth)
      await nextTick()
      await auth.submit()
      expect(auth.submitError).toBe('login-dialog.errors.invalid-credentials')
    })

    test('emits etc_woodblock_stuck sfx on backend error [obligation]', async () => {
      mockLogin.mockResolvedValueOnce('error')
      const auth = useLoginActions()
      fillValidFields(auth)
      await nextTick()
      await auth.submit()
      expect(mockEmitSfx).toHaveBeenCalledWith('etc_woodblock_stuck')
    })

    test('maps email-not-confirmed to its error key [obligation]', async () => {
      mockLogin.mockResolvedValueOnce('email-not-confirmed')
      const auth = useLoginActions()
      fillValidFields(auth)
      await nextTick()
      await auth.submit()
      expect(auth.submitError).toBe('login-dialog.errors.email-not-confirmed')
    })

    test('maps rate-limited to its error key [obligation]', async () => {
      mockLogin.mockResolvedValueOnce('rate-limited')
      const auth = useLoginActions()
      fillValidFields(auth)
      await nextTick()
      await auth.submit()
      expect(auth.submitError).toBe('login-dialog.errors.rate-limited')
    })

    test('clears submitError at the start of a new submit', async () => {
      mockLogin.mockResolvedValueOnce('invalid-credentials')
      const auth = useLoginActions()
      fillValidFields(auth)
      await nextTick()
      await auth.submit() // sets submitError
      expect(auth.submitError).not.toBe('')

      mockLogin.mockResolvedValueOnce('success')
      await auth.submit() // should clear it first
      expect(auth.submitError).toBe('')
    })
  })

  // ── clear-on-type [obligation] ──────────────────────────────────────────────

  describe('clear-on-type invariants', () => {
    test('typing in email clears errors.email [obligation]', async () => {
      // Submit empty to produce errors
      const auth = useLoginActions()
      await auth.submit()
      await nextTick()
      expect(auth.errors.email).toBeDefined()

      auth.email = 'user@example.com'
      await nextTick()
      expect(auth.errors.email).toBeUndefined()
    })

    test('typing in email clears submitError [obligation]', async () => {
      mockLogin.mockResolvedValueOnce('invalid-credentials')
      const auth = useLoginActions()
      fillValidFields(auth)
      await nextTick()
      await auth.submit()
      expect(auth.submitError).not.toBe('')

      auth.email = 'other@example.com'
      await nextTick()
      expect(auth.submitError).toBe('')
    })

    test('typing in password clears errors.password [obligation]', async () => {
      const auth = useLoginActions()
      auth.email = 'user@example.com'
      await nextTick()
      await auth.submit()
      await nextTick()
      expect(auth.errors.password).toBeDefined()

      auth.password = 'newpass'
      await nextTick()
      expect(auth.errors.password).toBeUndefined()
    })

    test('typing in password clears submitError [obligation]', async () => {
      mockLogin.mockResolvedValueOnce('invalid-credentials')
      const auth = useLoginActions()
      fillValidFields(auth)
      await nextTick()
      await auth.submit()
      expect(auth.submitError).not.toBe('')

      auth.password = 'newpass'
      await nextTick()
      expect(auth.submitError).toBe('')
    })

    test('typing in email does NOT clear errors.password [obligation]', async () => {
      // Get both errors set
      const auth = useLoginActions()
      await auth.submit()
      await nextTick()
      expect(auth.errors.password).toBeDefined()

      // Typing in email only clears email error
      auth.email = 'user@example.com'
      await nextTick()
      expect(auth.errors.password).toBeDefined()
    })

    test('typing in password does NOT clear errors.email [obligation]', async () => {
      const auth = useLoginActions()
      await auth.submit()
      await nextTick()
      expect(auth.errors.email).toBeDefined()

      auth.password = 'password1'
      await nextTick()
      expect(auth.errors.email).toBeDefined()
    })
  })

  // ── submitOAuth ─────────────────────────────────────────────────────────────

  describe('submitOAuth', () => {
    test('delegates to session.signInOAuth with the provider', () => {
      mockSignInOAuth.mockResolvedValueOnce(undefined)
      const auth = useLoginActions()
      auth.submitOAuth('google')
      expect(mockSignInOAuth).toHaveBeenCalledWith('google')
    })
  })
})
