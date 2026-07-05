import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { nextTick } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockSession } = vi.hoisted(() => ({
  mockSession: { user: { email: 'current@example.com' }, updateEmail: vi.fn() }
}))

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k) => k }) }))
vi.mock('@/stores/session', () => ({ useSessionStore: () => mockSession }))

import { useEmailActions } from '@/components/settings/account-access/use-email-actions'

beforeEach(() => {
  mockSession.user = { email: 'current@example.com' }
  mockSession.updateEmail.mockReset()
})

describe('useEmailActions — initial state', () => {
  test('seeds current_email from the session user email', () => {
    const email_actions = useEmailActions()
    expect(email_actions.current_email.value).toBe('current@example.com')
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

  test('rejects an unchanged email (new === current)', async () => {
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

  test('maps the "email-taken" outcome to an inline field error', async () => {
    mockSession.updateEmail.mockResolvedValueOnce('email-taken')
    const email_actions = useEmailActions()
    email_actions.email.value = 'new@example.com'

    const result = await email_actions.submit()

    expect(result).toBe('invalid')
    expect(email_actions.error.value).toBe('account-access-modal.email.validation-taken')
  })

  test('returns "error" for any other outcome', async () => {
    mockSession.updateEmail.mockResolvedValueOnce('error')
    const email_actions = useEmailActions()
    email_actions.email.value = 'new@example.com'

    const result = await email_actions.submit()

    expect(result).toBe('error')
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
