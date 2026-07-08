import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { mockAlert } = vi.hoisted(() => ({
  mockAlert: { warn: vi.fn() }
}))
const { mockNotice } = vi.hoisted(() => ({
  mockNotice: { error: vi.fn(), success: vi.fn() }
}))
const { mockRouter } = vi.hoisted(() => ({
  mockRouter: { push: vi.fn() }
}))

vi.mock('@/composables/alert', () => ({ useAlert: () => mockAlert }))
vi.mock('@/stores/notice-store', () => ({ useNoticeStore: () => mockNotice }))
vi.mock('vue-router', () => ({ useRouter: () => mockRouter }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k) => k }) }))

import { useMemberDangerActions } from '@/composables/member/danger-actions'

function confirmResponse(value) {
  mockAlert.warn.mockReturnValueOnce({ response: Promise.resolve(value) })
}

const close = vi.fn()

beforeEach(() => {
  mockAlert.warn.mockReset()
  mockNotice.success.mockReset()
  mockNotice.error.mockReset()
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
    expect(mockNotice.success).not.toHaveBeenCalled()
    expect(deleting_account.value).toBe(false)
  })

  test('on confirm, fires the success notice but does not close or navigate yet', async () => {
    const { onDeleteAccount } = useMemberDangerActions(close)
    confirmResponse(true)

    await onDeleteAccount()

    expect(mockNotice.success).toHaveBeenCalledWith(
      'toast.success.account-deleted',
      expect.objectContaining({ variant: 'panel' })
    )
    expect(close).not.toHaveBeenCalled()
    expect(mockRouter.push).not.toHaveBeenCalled()
  })

  test('close + navigate to welcome fire only when the notice onDismiss runs', async () => {
    const { onDeleteAccount } = useMemberDangerActions(close)
    confirmResponse(true)

    await onDeleteAccount()

    const [, options] = mockNotice.success.mock.calls[0]
    expect(close).not.toHaveBeenCalled()
    expect(mockRouter.push).not.toHaveBeenCalled()

    options.onDismiss()

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
})
