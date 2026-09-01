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
const { mockSession } = vi.hoisted(() => ({
  mockSession: { discardRevokedSession: vi.fn() }
}))
const { mockRequestAccountDeletion } = vi.hoisted(() => ({
  mockRequestAccountDeletion: vi.fn()
}))

vi.mock('@/composables/alert', () => ({ useAlert: () => mockAlert }))
vi.mock('@/stores/notice-store', () => ({ useNoticeStore: () => mockNotice }))
vi.mock('@/stores/session', () => ({ useSessionStore: () => mockSession }))
vi.mock('@/api/session', () => ({ requestAccountDeletion: mockRequestAccountDeletion }))
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
  mockSession.discardRevokedSession.mockReset().mockResolvedValue(undefined)
  mockRequestAccountDeletion.mockReset().mockResolvedValue('2026-08-05T00:00:00Z')
  close.mockReset()
})

describe('useMemberDangerActions', () => {
  test('aborts when the user cancels the confirm', async () => {
    const { onDeleteAccount, deleting_account } = useMemberDangerActions(close)
    confirmResponse(false)

    await onDeleteAccount()

    expect(mockRequestAccountDeletion).not.toHaveBeenCalled()
    expect(close).not.toHaveBeenCalled()
    expect(mockRouter.push).not.toHaveBeenCalled()
    expect(mockNotice.success).not.toHaveBeenCalled()
    expect(deleting_account.value).toBe(false)
  })

  test('on confirm, calls requestAccountDeletion then discards the revoked session before showing the success notice', async () => {
    const callOrder = []
    mockRequestAccountDeletion.mockImplementationOnce(async () => {
      callOrder.push('requestAccountDeletion')
      return '2026-08-05T00:00:00Z'
    })
    mockSession.discardRevokedSession.mockImplementationOnce(async () => {
      callOrder.push('discardRevokedSession')
    })
    mockNotice.success.mockImplementationOnce(() => {
      callOrder.push('success-notice')
    })
    const { onDeleteAccount } = useMemberDangerActions(close)
    confirmResponse(true)

    await onDeleteAccount()

    expect(callOrder).toEqual(['requestAccountDeletion', 'discardRevokedSession', 'success-notice'])
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
      confirmAudio: 'card.delete'
    })
  })

  test('resets deleting_account back to false after a successful run', async () => {
    const { onDeleteAccount, deleting_account } = useMemberDangerActions(close)
    confirmResponse(true)

    await onDeleteAccount()

    expect(deleting_account.value).toBe(false)
  })

  // ── failure path ────────────────────────────────────────────

  describe('when requestAccountDeletion fails', () => {
    test('shows an error notice and does NOT discard the session, close, or navigate', async () => {
      mockRequestAccountDeletion.mockRejectedValueOnce(new Error('network error'))
      const { onDeleteAccount } = useMemberDangerActions(close)
      confirmResponse(true)

      await onDeleteAccount()

      expect(mockNotice.error).toHaveBeenCalledWith('toast.error.account-delete-failed')
      expect(mockSession.discardRevokedSession).not.toHaveBeenCalled()
      expect(mockNotice.success).not.toHaveBeenCalled()
      expect(close).not.toHaveBeenCalled()
      expect(mockRouter.push).not.toHaveBeenCalled()
    })

    test('resets deleting_account back to false even on failure', async () => {
      mockRequestAccountDeletion.mockRejectedValueOnce(new Error('network error'))
      const { onDeleteAccount, deleting_account } = useMemberDangerActions(close)
      confirmResponse(true)

      await onDeleteAccount()

      expect(deleting_account.value).toBe(false)
    })
  })
})
