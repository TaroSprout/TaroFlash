import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { nextTick } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockSession, mockEmitSfx } = vi.hoisted(() => ({
  mockSession: { user: { email: 'current@example.com' }, updateEmail: vi.fn() },
  mockEmitSfx: vi.fn()
}))

const { mockNotice } = vi.hoisted(() => ({
  mockNotice: { error: vi.fn(), success: vi.fn(), warn: vi.fn() }
}))

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k) => k }) }))
vi.mock('@/stores/session', () => ({ useSessionStore: () => mockSession }))
vi.mock('@/stores/member', async () => {
  const { reactive } = await import('vue')
  const mockMember = reactive({ email: 'current@example.com' })
  return { useMemberStore: () => mockMember, __mockMember: mockMember }
})
vi.mock('@/stores/notice-store', () => ({ useNoticeStore: () => mockNotice }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

import { useEmailActions } from '@/views/settings/account-access/use-email-actions'
import { __mockMember as mockMember } from '@/stores/member'

beforeEach(() => {
  mockSession.user = { email: 'current@example.com' }
  mockSession.updateEmail.mockReset()
  mockMember.email = 'current@example.com'
  mockEmitSfx.mockReset()
  mockNotice.error.mockReset()
})

describe('useEmailActions — initial state', () => {
  test('seeds current_email from the member store email', () => {
    const email_actions = useEmailActions()
    expect(email_actions.current_email.value).toBe('current@example.com')
  })

  test('[obligation] current_email is reactive to changes in the member store, not a static snapshot', () => {
    const email_actions = useEmailActions()
    expect(email_actions.current_email.value).toBe('current@example.com')

    mockMember.email = 'updated@example.com'

    expect(email_actions.current_email.value).toBe('updated@example.com')
  })

  test('falls back to an empty string when the member store has no email yet', () => {
    mockMember.email = null
    const email_actions = useEmailActions()
    expect(email_actions.current_email.value).toBe('')
  })
})

describe('useEmailActions — validation', () => {
  test('rejects an empty new email as required', async () => {
    const email_actions = useEmailActions()
    email_actions.email.value = ''
    const result = await email_actions.submit()
    expect(result).toBe('invalid')
    expect(email_actions.error.value).toBe('account-access-modal.email.validation-required')
  })

  test('rejects an invalid email format', async () => {
    const email_actions = useEmailActions()
    email_actions.email.value = 'not-an-email'
    // Let the pre-flush error-clearing watcher settle before submit runs, so
    // it doesn't race with (and wipe) the error validate() is about to set.
    await nextTick()
    const result = await email_actions.submit()
    expect(result).toBe('invalid')
    expect(email_actions.error.value).toBe('account-access-modal.email.validation-invalid')
  })

  test('[obligation] rejects submitting the member store current email as unchanged', async () => {
    mockMember.email = 'current@example.com'
    const email_actions = useEmailActions()
    email_actions.email.value = 'current@example.com'
    await nextTick()
    const result = await email_actions.submit()
    expect(result).toBe('invalid')
    expect(email_actions.error.value).toBe('account-access-modal.email.validation-unchanged')
  })

  test('clears the error as soon as the email field is edited again', async () => {
    const email_actions = useEmailActions()
    email_actions.email.value = ''
    await email_actions.submit()
    expect(email_actions.error.value).not.toBe('')

    email_actions.email.value = 'n@example.com'
    await Promise.resolve()
    expect(email_actions.error.value).toBe('')
  })

  test('[obligation] plays the stuck sfx when client-side validation fails', async () => {
    const email_actions = useEmailActions()
    email_actions.email.value = ''
    await email_actions.submit()
    expect(mockEmitSfx).toHaveBeenCalledWith('etc_woodblock_stuck')
  })

  test('[obligation] does NOT fire a notice-store error for a validation failure', async () => {
    const email_actions = useEmailActions()
    email_actions.email.value = ''
    await email_actions.submit()
    expect(mockNotice.error).not.toHaveBeenCalled()
  })
})

describe('useEmailActions — submit', () => {
  test('[obligation] "success" sets pending true rather than changing current_email — double_confirm_changes requires both inboxes', async () => {
    mockSession.updateEmail.mockResolvedValueOnce('success')
    const email_actions = useEmailActions()
    email_actions.email.value = 'new@example.com'

    const result = await email_actions.submit()

    expect(result).toBe('success')
    expect(email_actions.pending.value).toBe(true)
    expect(email_actions.current_email.value).toBe('current@example.com')
  })

  test('[obligation] does not play the stuck sfx on a successful submit', async () => {
    mockSession.updateEmail.mockResolvedValueOnce('success')
    const email_actions = useEmailActions()
    email_actions.email.value = 'new@example.com'

    await email_actions.submit()

    expect(mockEmitSfx).not.toHaveBeenCalled()
  })

  test('maps the "email-taken" outcome to an inline field error', async () => {
    mockSession.updateEmail.mockResolvedValueOnce('email-taken')
    const email_actions = useEmailActions()
    email_actions.email.value = 'new@example.com'

    const result = await email_actions.submit()

    expect(result).toBe('invalid')
    expect(email_actions.error.value).toBe('account-access-modal.email.validation-taken')
  })

  test('[obligation] does NOT fire a notice-store error for the "email-taken" outcome', async () => {
    mockSession.updateEmail.mockResolvedValueOnce('email-taken')
    const email_actions = useEmailActions()
    email_actions.email.value = 'new@example.com'

    await email_actions.submit()

    expect(mockNotice.error).not.toHaveBeenCalled()
  })

  test('returns "error" for any other outcome', async () => {
    mockSession.updateEmail.mockResolvedValueOnce('error')
    const email_actions = useEmailActions()
    email_actions.email.value = 'new@example.com'

    const result = await email_actions.submit()

    expect(result).toBe('error')
  })

  test('[obligation] fires a notice-store error only on the true fallthrough "error" outcome', async () => {
    mockSession.updateEmail.mockResolvedValueOnce('error')
    const email_actions = useEmailActions()
    email_actions.email.value = 'new@example.com'

    await email_actions.submit()

    expect(mockNotice.error).toHaveBeenCalledWith('account-access-modal.email.error')
  })

  test('[obligation] plays the stuck sfx for every non-success server outcome', async () => {
    for (const outcome of ['email-taken', 'error']) {
      mockEmitSfx.mockReset()
      mockSession.updateEmail.mockResolvedValueOnce(outcome)
      const email_actions = useEmailActions()
      email_actions.email.value = 'new@example.com'

      await email_actions.submit()

      expect(mockEmitSfx).toHaveBeenCalledWith('etc_woodblock_stuck')
    }
  })

  test('toggles loading around the submit call', async () => {
    let resolveUpdate
    mockSession.updateEmail.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveUpdate = resolve
      })
    )
    const email_actions = useEmailActions()
    email_actions.email.value = 'new@example.com'

    const promise = email_actions.submit()
    expect(email_actions.loading.value).toBe(true)

    resolveUpdate('success')
    await promise

    expect(email_actions.loading.value).toBe(false)
  })

  test('trims whitespace from the submitted email', async () => {
    mockSession.updateEmail.mockResolvedValueOnce('success')
    const email_actions = useEmailActions()
    email_actions.email.value = '  new@example.com  '

    await email_actions.submit()

    expect(mockSession.updateEmail).toHaveBeenCalledWith('new@example.com')
  })
})
