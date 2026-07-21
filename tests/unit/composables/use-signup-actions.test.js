import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockEmitSfx, mockSignupEmail, mockSignInOAuth, mockIsDisplayNameAvailable } = vi.hoisted(
  () => ({
    mockEmitSfx: vi.fn(),
    mockSignupEmail: vi.fn(),
    mockSignInOAuth: vi.fn(),
    mockIsDisplayNameAvailable: vi.fn()
  })
)

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

vi.mock('@/api/session', () => ({
  isDisplayNameAvailable: mockIsDisplayNameAvailable
}))

import { useSignupActions } from '@/composables/auth/use-signup-actions'

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
  // Default: the chosen display name is free, so submit() proceeds to signup.
  mockIsDisplayNameAvailable.mockReset()
  mockIsDisplayNameAvailable.mockResolvedValue(true)
})

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useSignupActions', () => {
  // ── all_filled ────────────────────────────────────────────────────────────

  describe('all_filled', () => {
    test('is false when all fields are empty [obligation]', () => {
      const auth = useSignupActions()
      expect(auth.all_filled).toBe(false)
    })

    test('is false when only some fields are filled [obligation]', () => {
      const auth = useSignupActions()
      auth.username = 'Alice'
      auth.email = 'alice@example.com'
      expect(auth.all_filled).toBe(false)
    })

    test('is true only when all four fields are non-empty [obligation]', () => {
      const auth = useSignupActions()
      fillValidFields(auth)
      expect(auth.all_filled).toBe(true)
    })

    test('is false when username is only whitespace [obligation]', () => {
      const auth = useSignupActions()
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
      const auth = useSignupActions()
      expect(Object.keys(auth.errors)).toHaveLength(0)
    })

    test('errors populate after the first submit attempt [obligation]', async () => {
      const auth = useSignupActions()
      await auth.submit()
      await nextTick()
      expect(Object.keys(auth.errors).length).toBeGreaterThan(0)
    })
  })

  // ── submit() — invalid path (no network call) ─────────────────────────────

  describe('submit() — validation failure', () => {
    test('returns "invalid" without calling the store when fields are empty [obligation]', async () => {
      const auth = useSignupActions()
      const result = await auth.submit()
      expect(result).toBe('invalid')
      expect(mockSignupEmail).not.toHaveBeenCalled()
    })

    test('emits digi_powerdown sfx on validation failure [obligation]', async () => {
      const auth = useSignupActions()
      await auth.submit()
      expect(mockEmitSfx).toHaveBeenCalledWith('digi_powerdown')
    })

    test('sets tried_submit so errors populate [obligation]', async () => {
      const auth = useSignupActions()
      await auth.submit()
      await nextTick()
      expect(auth.errors.username).toBeDefined()
    })

    test('returns "invalid" when email format is invalid', async () => {
      const auth = useSignupActions()
      auth.username = 'Alice'
      auth.email = 'not-an-email'
      auth.password = 'password1'
      auth.confirm_password = 'password1'
      // Flush watchers so they don't clear the errors that validate() sets next.
      await nextTick()
      const result = await auth.submit()
      expect(result).toBe('invalid')
      expect(auth.errors.email).toBeDefined()
    })

    test('returns "invalid" when passwords do not match', async () => {
      const auth = useSignupActions()
      auth.username = 'Alice'
      auth.email = 'alice@example.com'
      auth.password = 'password1'
      auth.confirm_password = 'different1'
      await nextTick()
      const result = await auth.submit()
      expect(result).toBe('invalid')
      expect(auth.errors.confirm_password).toBeDefined()
    })

    test('returns "invalid" when password is too short', async () => {
      const auth = useSignupActions()
      auth.username = 'Alice'
      auth.email = 'alice@example.com'
      auth.password = 'short'
      auth.confirm_password = 'short'
      await nextTick()
      const result = await auth.submit()
      expect(result).toBe('invalid')
      expect(auth.errors.password).toBeDefined()
    })
  })

  // ── submit() — success path ───────────────────────────────────────────────

  describe('submit() — success', () => {
    test('returns "success" when store outcome is "success" [obligation]', async () => {
      mockSignupEmail.mockResolvedValueOnce('success')
      const auth = useSignupActions()
      fillValidFields(auth)
      const result = await auth.submit()
      expect(result).toBe('success')
    })

    test('calls the store with trimmed email and display_name', async () => {
      mockSignupEmail.mockResolvedValueOnce('success')
      const auth = useSignupActions()
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
      const auth = useSignupActions()
      fillValidFields(auth)
      await auth.submit()
      expect(mockEmitSfx).not.toHaveBeenCalled()
    })
  })

  // ── submit() — email-taken path ───────────────────────────────────────────

  describe('submit() — email taken', () => {
    test('returns "invalid" when store outcome is "email-taken" [obligation]', async () => {
      mockSignupEmail.mockResolvedValueOnce('email-taken')
      const auth = useSignupActions()
      fillValidFields(auth)
      const result = await auth.submit()
      expect(result).toBe('invalid')
    })

    test('sets inline email error when email is taken [obligation]', async () => {
      mockSignupEmail.mockResolvedValueOnce('email-taken')
      const auth = useSignupActions()
      fillValidFields(auth)
      await auth.submit()
      await nextTick()
      expect(auth.errors.email).toBeDefined()
    })

    test('emits etc_woodblock_stuck sfx when email is taken [obligation]', async () => {
      mockSignupEmail.mockResolvedValueOnce('email-taken')
      const auth = useSignupActions()
      fillValidFields(auth)
      await auth.submit()
      expect(mockEmitSfx).toHaveBeenCalledWith('etc_woodblock_stuck')
    })
  })

  // ── submit() — display name taken ─────────────────────────────────────────

  describe('submit() — display name taken', () => {
    test('checks availability with the trimmed username before signing up', async () => {
      mockSignupEmail.mockResolvedValueOnce('success')
      const auth = useSignupActions()
      auth.username = '  Alice  '
      auth.email = 'alice@example.com'
      auth.password = 'password1'
      auth.confirm_password = 'password1'
      await auth.submit()
      expect(mockIsDisplayNameAvailable).toHaveBeenCalledWith('Alice')
    })

    test('returns "invalid" and never calls signup when the name is taken', async () => {
      mockIsDisplayNameAvailable.mockResolvedValueOnce(false)
      const auth = useSignupActions()
      fillValidFields(auth)
      const result = await auth.submit()
      expect(result).toBe('invalid')
      expect(mockSignupEmail).not.toHaveBeenCalled()
    })

    test('sets the inline username error when the name is taken', async () => {
      mockIsDisplayNameAvailable.mockResolvedValueOnce(false)
      const auth = useSignupActions()
      fillValidFields(auth)
      await auth.submit()
      await nextTick()
      expect(auth.errors.username).toBeDefined()
    })

    test('emits etc_woodblock_stuck sfx when the name is taken', async () => {
      mockIsDisplayNameAvailable.mockResolvedValueOnce(false)
      const auth = useSignupActions()
      fillValidFields(auth)
      await auth.submit()
      expect(mockEmitSfx).toHaveBeenCalledWith('etc_woodblock_stuck')
    })

    test('typing in username clears the taken-name error', async () => {
      mockIsDisplayNameAvailable.mockResolvedValueOnce(false)
      const auth = useSignupActions()
      fillValidFields(auth)
      await auth.submit()
      await nextTick()
      expect(auth.errors.username).toBeDefined()

      auth.username = 'Bobbie'
      await nextTick()
      expect(auth.errors.username).toBeUndefined()
    })
  })

  // ── submit() — error path ─────────────────────────────────────────────────

  describe('submit() — error', () => {
    test('returns "error" when store outcome is "error" [obligation]', async () => {
      mockSignupEmail.mockResolvedValueOnce('error')
      const auth = useSignupActions()
      fillValidFields(auth)
      const result = await auth.submit()
      expect(result).toBe('error')
    })

    test('does NOT emit sfx on store error [obligation]', async () => {
      mockSignupEmail.mockResolvedValueOnce('error')
      const auth = useSignupActions()
      fillValidFields(auth)
      await auth.submit()
      expect(mockEmitSfx).not.toHaveBeenCalled()
    })
  })

  // ── clear-on-type [obligation] ────────────────────────────────────────────

  describe('clear-on-type', () => {
    test('typing in email clears errors.email including backend email-taken message [obligation]', async () => {
      mockSignupEmail.mockResolvedValueOnce('email-taken')
      const auth = useSignupActions()
      fillValidFields(auth)
      await auth.submit()
      await nextTick()
      // email error is now set from email-taken
      expect(auth.errors.email).toBeDefined()

      // Typing in email clears it
      auth.email = 'new@example.com'
      await nextTick()
      expect(auth.errors.email).toBeUndefined()
    })

    test('typing in username clears errors.username only', async () => {
      const auth = useSignupActions()
      await auth.submit() // all fields empty → username error set
      await nextTick()
      expect(auth.errors.username).toBeDefined()

      auth.username = 'Bob'
      await nextTick()
      expect(auth.errors.username).toBeUndefined()
    })

    test('clearing one field does not clear other fields errors [obligation]', async () => {
      const auth = useSignupActions()
      await auth.submit()
      await nextTick()
      expect(auth.errors.email).toBeDefined()

      // Typing in username clears username error but not email error
      auth.username = 'Bob'
      await nextTick()
      expect(auth.errors.username).toBeUndefined()
      expect(auth.errors.email).toBeDefined()
    })
  })

  // ── submitOAuth ────────────────────────────────────────────────────────────

  describe('submitOAuth', () => {
    test('delegates to session.signInOAuth with provider and dashboard redirect', () => {
      mockSignInOAuth.mockResolvedValueOnce(undefined)
      const auth = useSignupActions()
      auth.submitOAuth('google')
      expect(mockSignInOAuth).toHaveBeenCalledWith('google', { redirectTo: '/dashboard' })
    })
  })
})
