import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockEmitSfx, mockSignupEmail, mockSignInOAuth } = vi.hoisted(() => ({
  mockEmitSfx: vi.fn(),
  mockSignupEmail: vi.fn(),
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
  useSessionStore: () => ({ signupEmail: mockSignupEmail, signInOAuth: mockSignInOAuth })
}))

import { useAuthActions } from '@/views/welcome/sign-up/use-auth-actions'

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Fill all four fields with valid values. */
function fillValidFields(auth) {
  auth.username = 'Alice'
  auth.email = 'alice@example.com'
  auth.password = 'password1'
  auth.confirm_password = 'password1'
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  setActivePinia(createPinia())
  mockEmitSfx.mockReset()
  mockSignupEmail.mockReset()
})

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useAuthActions', () => {
  // ── all_filled ────────────────────────────────────────────────────────────

  describe('all_filled', () => {
    test('is false when all fields are empty [obligation]', () => {
      const auth = useAuthActions()
      expect(auth.all_filled).toBe(false)
    })

    test('is false when only some fields are filled [obligation]', () => {
      const auth = useAuthActions()
      auth.username = 'Alice'
      auth.email = 'alice@example.com'
      expect(auth.all_filled).toBe(false)
    })

    test('is true only when all four fields are non-empty [obligation]', () => {
      const auth = useAuthActions()
      fillValidFields(auth)
      expect(auth.all_filled).toBe(true)
    })

    test('is false when username is only whitespace [obligation]', () => {
      const auth = useAuthActions()
      auth.username = '   '
      auth.email = 'alice@example.com'
      auth.password = 'password1'
      auth.confirm_password = 'password1'
      expect(auth.all_filled).toBe(false)
    })
  })

  // ── field errors gated on tried_submit ────────────────────────────────────

  describe('errors before first submit', () => {
    test('errors are empty before any submit attempt [obligation]', () => {
      const auth = useAuthActions()
      expect(Object.keys(auth.errors)).toHaveLength(0)
    })

    test('errors populate after the first submit attempt [obligation]', async () => {
      const auth = useAuthActions()
      await auth.submit()
      await nextTick()
      expect(Object.keys(auth.errors).length).toBeGreaterThan(0)
    })
  })

  // ── submit() — invalid path (no network call) ─────────────────────────────

  describe('submit() — validation failure', () => {
    test('returns "invalid" without calling the store when fields are empty [obligation]', async () => {
      const auth = useAuthActions()
      const result = await auth.submit()
      expect(result).toBe('invalid')
      expect(mockSignupEmail).not.toHaveBeenCalled()
    })

    test('emits digi_powerdown sfx on validation failure [obligation]', async () => {
      const auth = useAuthActions()
      await auth.submit()
      expect(mockEmitSfx).toHaveBeenCalledWith('digi_powerdown')
    })

    test('sets tried_submit so errors populate [obligation]', async () => {
      const auth = useAuthActions()
      await auth.submit()
      await nextTick()
      expect(auth.errors.username).toBeDefined()
    })

    test('returns "invalid" when email format is invalid', async () => {
      const auth = useAuthActions()
      auth.username = 'Alice'
      auth.email = 'not-an-email'
      auth.password = 'password1'
      auth.confirm_password = 'password1'
      const result = await auth.submit()
      expect(result).toBe('invalid')
      expect(auth.errors.email).toBeDefined()
    })

    test('returns "invalid" when passwords do not match', async () => {
      const auth = useAuthActions()
      auth.username = 'Alice'
      auth.email = 'alice@example.com'
      auth.password = 'password1'
      auth.confirm_password = 'different1'
      const result = await auth.submit()
      expect(result).toBe('invalid')
      expect(auth.errors.confirm_password).toBeDefined()
    })

    test('returns "invalid" when password is too short', async () => {
      const auth = useAuthActions()
      auth.username = 'Alice'
      auth.email = 'alice@example.com'
      auth.password = 'short'
      auth.confirm_password = 'short'
      const result = await auth.submit()
      expect(result).toBe('invalid')
      expect(auth.errors.password).toBeDefined()
    })
  })

  // ── submit() — success path ───────────────────────────────────────────────

  describe('submit() — success', () => {
    test('returns "success" when store outcome is "success" [obligation]', async () => {
      mockSignupEmail.mockResolvedValueOnce('success')
      const auth = useAuthActions()
      fillValidFields(auth)
      const result = await auth.submit()
      expect(result).toBe('success')
    })

    test('calls the store with trimmed email and display_name', async () => {
      mockSignupEmail.mockResolvedValueOnce('success')
      const auth = useAuthActions()
      auth.username = '  Alice  '
      auth.email = '  alice@example.com  '
      auth.password = 'password1'
      auth.confirm_password = 'password1'
      await auth.submit()
      expect(mockSignupEmail).toHaveBeenCalledWith('alice@example.com', 'password1', {
        display_name: 'Alice'
      })
    })

    test('does not emit sfx on success', async () => {
      mockSignupEmail.mockResolvedValueOnce('success')
      const auth = useAuthActions()
      fillValidFields(auth)
      await auth.submit()
      expect(mockEmitSfx).not.toHaveBeenCalled()
    })
  })

  // ── submit() — email-taken path ───────────────────────────────────────────

  describe('submit() — email taken', () => {
    test('returns "invalid" when store outcome is "email-taken" [obligation]', async () => {
      mockSignupEmail.mockResolvedValueOnce('email-taken')
      const auth = useAuthActions()
      fillValidFields(auth)
      const result = await auth.submit()
      expect(result).toBe('invalid')
    })

    test('sets inline email error when email is taken [obligation]', async () => {
      mockSignupEmail.mockResolvedValueOnce('email-taken')
      const auth = useAuthActions()
      fillValidFields(auth)
      await auth.submit()
      await nextTick()
      expect(auth.errors.email).toBeDefined()
    })

    test('emits etc_woodblock_stuck sfx when email is taken [obligation]', async () => {
      mockSignupEmail.mockResolvedValueOnce('email-taken')
      const auth = useAuthActions()
      fillValidFields(auth)
      await auth.submit()
      expect(mockEmitSfx).toHaveBeenCalledWith('etc_woodblock_stuck')
    })
  })

  // ── submit() — error path ─────────────────────────────────────────────────

  describe('submit() — error', () => {
    test('returns "error" when store outcome is "error" [obligation]', async () => {
      mockSignupEmail.mockResolvedValueOnce('error')
      const auth = useAuthActions()
      fillValidFields(auth)
      const result = await auth.submit()
      expect(result).toBe('error')
    })

    test('does NOT emit sfx on store error [obligation]', async () => {
      mockSignupEmail.mockResolvedValueOnce('error')
      const auth = useAuthActions()
      fillValidFields(auth)
      await auth.submit()
      expect(mockEmitSfx).not.toHaveBeenCalled()
    })
  })

  // ── submitOAuth ────────────────────────────────────────────────────────────

  describe('submitOAuth', () => {
    test('delegates to session.signInOAuth with provider and dashboard redirect', () => {
      mockSignInOAuth.mockResolvedValueOnce(undefined)
      const auth = useAuthActions()
      auth.submitOAuth('google')
      expect(mockSignInOAuth).toHaveBeenCalledWith('google', { redirectTo: '/dashboard' })
    })
  })
})
