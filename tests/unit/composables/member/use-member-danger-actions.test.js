import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { mockAlert } = vi.hoisted(() => ({
  mockAlert: { warn: vi.fn() }
}))
const { mockToast } = vi.hoisted(() => ({
  mockToast: { error: vi.fn(), success: vi.fn() }
}))
const { mockRouter } = vi.hoisted(() => ({
  mockRouter: { push: vi.fn() }
}))

vi.mock('@/composables/alert', () => ({ useAlert: () => mockAlert }))
vi.mock('@/composables/toast', () => ({ useToast: () => mockToast }))
vi.mock('vue-router', () => ({ useRouter: () => mockRouter }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k) => k }) }))

import { useMemberDangerActions } from '@/composables/member/danger-actions'

function confirmResponse(value) {
  mockAlert.warn.mockReturnValueOnce({ response: Promise.resolve(value) })
}

const close = vi.fn()

beforeEach(() => {
  mockAlert.warn.mockReset()
  mockToast.success.mockReset()
  mockToast.error.mockReset()
  mockRouter.push.mockReset()
  close.mockReset()
})

describe('useMemberDangerActions', () => {
  test('aborts when the user cancels the confirm', async () => {
    const { onDeleteAccount, deleting_account } = useMemberDangerActions(close)
    confirmResponse(false)

    await onDeleteAccount()

    expect(close).not.toHaveBeenCalled()
    expect(mockRouter.push).not.toHaveBeenCalled()
    expect(mockToast.success).not.toHaveBeenCalled()
    expect(deleting_account.value).toBe(false)
  })

  test('on confirm, fires the success toast, closes, and routes to welcome', async () => {
    const { onDeleteAccount } = useMemberDangerActions(close)
    confirmResponse(true)

    await onDeleteAccount()

    expect(mockToast.success).toHaveBeenCalledWith('toast.success.account-deleted')
    expect(close).toHaveBeenCalledOnce()
    expect(mockRouter.push).toHaveBeenCalledWith({ name: 'welcome' })
  })

  test('passes the locale keys + confirm audio to the warn alert', async () => {
    const { onDeleteAccount } = useMemberDangerActions(close)
    confirmResponse(false)

    await onDeleteAccount()

    expect(mockAlert.warn).toHaveBeenCalledWith({
      title: 'alert.delete-account.title',
      message: 'alert.delete-account.message',
      confirmLabel: 'alert.delete-account.confirm',
      confirmAudio: 'trash_crumple_short'
    })
  })

  test('resets deleting_account back to false after a successful run', async () => {
    const { onDeleteAccount, deleting_account } = useMemberDangerActions(close)
    confirmResponse(true)

    await onDeleteAccount()

    expect(deleting_account.value).toBe(false)
  })

  test('resets deleting_account back to false even when router.push throws', async () => {
    const { onDeleteAccount, deleting_account } = useMemberDangerActions(close)
    confirmResponse(true)
    mockRouter.push.mockImplementationOnce(() => {
      throw new Error('nav failed')
    })

    await expect(onDeleteAccount()).rejects.toThrow('nav failed')
    expect(deleting_account.value).toBe(false)
  })
})
