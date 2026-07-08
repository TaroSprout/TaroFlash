import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { ref } from 'vue'

const { mockAlert } = vi.hoisted(() => ({
  mockAlert: { warn: vi.fn() }
}))
const { mockNotice } = vi.hoisted(() => ({
  mockNotice: { error: vi.fn(), success: vi.fn() }
}))
const { mockRouter, mockRoute } = vi.hoisted(() => ({
  mockRouter: { push: vi.fn() },
  mockRoute: { name: 'dashboard', params: {} }
}))

vi.mock('@/composables/alert', () => ({ useAlert: () => mockAlert }))
vi.mock('@/stores/notice-store', () => ({ useNoticeStore: () => mockNotice }))
vi.mock('vue-router', () => ({
  useRouter: () => mockRouter,
  useRoute: () => mockRoute
}))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k) => k }) }))

import { useDeckDangerActions } from '@/composables/deck/danger-actions'

function makeEditor({ deleteOk = true, resetOk = true } = {}) {
  return {
    deleting: ref(false),
    resetting_reviews: ref(false),
    deleteDeck: vi.fn(async () => deleteOk),
    resetReviews: vi.fn(async () => resetOk)
  }
}

function confirmResponse(value) {
  mockAlert.warn.mockReturnValueOnce({ response: Promise.resolve(value) })
}

const deck = { id: 42 }
const close = vi.fn()

beforeEach(() => {
  mockAlert.warn.mockReset()
  mockNotice.error.mockReset()
  mockNotice.success.mockReset()
  mockRouter.push.mockReset()
  close.mockReset()
  mockRoute.name = 'dashboard'
  mockRoute.params = {}
})

describe('useDeckDangerActions', () => {
  describe('onResetReviews', () => {
    test('aborts if the user cancels the confirm', async () => {
      const editor = makeEditor()
      const { onResetReviews } = useDeckDangerActions(editor, deck, close)
      confirmResponse(false)

      await onResetReviews()

      expect(editor.resetReviews).not.toHaveBeenCalled()
      expect(mockNotice.success).not.toHaveBeenCalled()
      expect(mockNotice.error).not.toHaveBeenCalled()
    })

    test('success path shows a success notice with the success_3 sfx', async () => {
      const editor = makeEditor({ resetOk: true })
      const { onResetReviews } = useDeckDangerActions(editor, deck, close)
      confirmResponse(true)

      await onResetReviews()

      expect(editor.resetReviews).toHaveBeenCalledTimes(1)
      expect(mockNotice.success).toHaveBeenCalledWith(
        'toast.success.reset-reviews',
        expect.objectContaining({ variant: 'panel', sfx: { open: 'success_3' } })
      )
      expect(mockNotice.error).not.toHaveBeenCalled()
    })

    test('failure path shows an error notice without an explicit sfx and bails', async () => {
      const editor = makeEditor({ resetOk: false })
      const { onResetReviews } = useDeckDangerActions(editor, deck, close)
      confirmResponse(true)

      await onResetReviews()

      expect(mockNotice.error).toHaveBeenCalledWith(
        'toast.error.reset-reviews-failed',
        expect.objectContaining({ variant: 'panel' })
      )
      const [, options] = mockNotice.error.mock.calls[0]
      expect(options.sfx).toBeUndefined()
      expect(mockNotice.success).not.toHaveBeenCalled()
    })
  })

  describe('onDelete', () => {
    test('aborts if the user cancels the confirm', async () => {
      const editor = makeEditor()
      const { onDelete } = useDeckDangerActions(editor, deck, close)
      confirmResponse(false)

      await onDelete()

      expect(editor.deleteDeck).not.toHaveBeenCalled()
      expect(close).not.toHaveBeenCalled()
    })

    test('fires the success notice but does not close or navigate yet', async () => {
      const editor = makeEditor({ deleteOk: true })
      const { onDelete } = useDeckDangerActions(editor, deck, close)
      confirmResponse(true)

      await onDelete()

      expect(mockNotice.success).toHaveBeenCalledWith(
        'toast.success.deck-deleted',
        expect.objectContaining({ variant: 'panel' })
      )
      expect(close).not.toHaveBeenCalled()
      expect(mockRouter.push).not.toHaveBeenCalled()
    })

    test('onDismiss closes with true and navigates to dashboard when viewing the deleted deck', async () => {
      const editor = makeEditor({ deleteOk: true })
      mockRoute.name = 'deck'
      mockRoute.params = { id: '42' }
      const { onDelete } = useDeckDangerActions(editor, deck, close)
      confirmResponse(true)

      await onDelete()
      const [, options] = mockNotice.success.mock.calls[0]
      options.onDismiss()

      expect(close).toHaveBeenCalledWith(true)
      expect(mockRouter.push).toHaveBeenCalledWith({ name: 'dashboard' })
    })

    test('onDismiss closes with true but does not navigate when viewing an unrelated route', async () => {
      const editor = makeEditor({ deleteOk: true })
      mockRoute.name = 'dashboard'
      const { onDelete } = useDeckDangerActions(editor, deck, close)
      confirmResponse(true)

      await onDelete()
      const [, options] = mockNotice.success.mock.calls[0]
      options.onDismiss()

      expect(close).toHaveBeenCalledWith(true)
      expect(mockRouter.push).not.toHaveBeenCalled()
    })

    test('onDismiss does not navigate when viewing a different deck', async () => {
      const editor = makeEditor({ deleteOk: true })
      mockRoute.name = 'deck'
      mockRoute.params = { id: '99' }
      const { onDelete } = useDeckDangerActions(editor, deck, close)
      confirmResponse(true)

      await onDelete()
      const [, options] = mockNotice.success.mock.calls[0]
      options.onDismiss()

      expect(mockRouter.push).not.toHaveBeenCalled()
    })

    test('failure path shows an error notice and does not close', async () => {
      const editor = makeEditor({ deleteOk: false })
      const { onDelete } = useDeckDangerActions(editor, deck, close)
      confirmResponse(true)

      await onDelete()

      expect(mockNotice.error).toHaveBeenCalledTimes(1)
      expect(close).not.toHaveBeenCalled()
    })
  })

  test('exposes editor.deleting and editor.resetting_reviews refs', () => {
    const editor = makeEditor()
    const { deleting, resetting_reviews } = useDeckDangerActions(editor, deck, close)
    expect(deleting).toBe(editor.deleting)
    expect(resetting_reviews).toBe(editor.resetting_reviews)
  })
})
