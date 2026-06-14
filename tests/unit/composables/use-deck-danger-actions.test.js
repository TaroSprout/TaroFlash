import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

const { mockAlert } = vi.hoisted(() => ({
  mockAlert: { warn: vi.fn() }
}))
const { mockToast } = vi.hoisted(() => ({
  mockToast: { error: vi.fn(), success: vi.fn() }
}))
const { mockRouter, mockRoute } = vi.hoisted(() => ({
  mockRouter: { push: vi.fn() },
  mockRoute: { name: 'dashboard', params: {} }
}))

vi.mock('@/composables/alert', () => ({ useAlert: () => mockAlert }))
vi.mock('@/composables/toast', () => ({ useToast: () => mockToast }))
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
  mockToast.error.mockReset()
  mockToast.success.mockReset()
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
      expect(mockToast.success).not.toHaveBeenCalled()
      expect(mockToast.error).not.toHaveBeenCalled()
    })

    test('success path shows a success toast', async () => {
      const editor = makeEditor({ resetOk: true })
      const { onResetReviews } = useDeckDangerActions(editor, deck, close)
      confirmResponse(true)

      await onResetReviews()

      expect(editor.resetReviews).toHaveBeenCalledTimes(1)
      expect(mockToast.success).toHaveBeenCalledTimes(1)
      expect(mockToast.error).not.toHaveBeenCalled()
    })

    test('failure path shows an error toast and bails', async () => {
      const editor = makeEditor({ resetOk: false })
      const { onResetReviews } = useDeckDangerActions(editor, deck, close)
      confirmResponse(true)

      await onResetReviews()

      expect(mockToast.error).toHaveBeenCalledTimes(1)
      expect(mockToast.success).not.toHaveBeenCalled()
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

    test('closes the modal with true on success', async () => {
      const editor = makeEditor({ deleteOk: true })
      const { onDelete } = useDeckDangerActions(editor, deck, close)
      confirmResponse(true)

      await onDelete()

      expect(close).toHaveBeenCalledWith(true)
    })

    test('navigates to the dashboard when the user was viewing the deleted deck', async () => {
      const editor = makeEditor({ deleteOk: true })
      mockRoute.name = 'deck'
      mockRoute.params = { id: '42' }
      const { onDelete } = useDeckDangerActions(editor, deck, close)
      confirmResponse(true)

      await onDelete()
      await flushPromises()

      expect(mockRouter.push).toHaveBeenCalledWith({ name: 'dashboard' })
    })

    test('does not navigate when viewing an unrelated route', async () => {
      const editor = makeEditor({ deleteOk: true })
      mockRoute.name = 'dashboard'
      const { onDelete } = useDeckDangerActions(editor, deck, close)
      confirmResponse(true)

      await onDelete()
      await flushPromises()

      expect(mockRouter.push).not.toHaveBeenCalled()
    })

    test('does not navigate when viewing a different deck', async () => {
      const editor = makeEditor({ deleteOk: true })
      mockRoute.name = 'deck'
      mockRoute.params = { id: '99' }
      const { onDelete } = useDeckDangerActions(editor, deck, close)
      confirmResponse(true)

      await onDelete()
      await flushPromises()

      expect(mockRouter.push).not.toHaveBeenCalled()
    })

    test('failure path shows an error toast and does not close', async () => {
      const editor = makeEditor({ deleteOk: false })
      const { onDelete } = useDeckDangerActions(editor, deck, close)
      confirmResponse(true)

      await onDelete()

      expect(mockToast.error).toHaveBeenCalledTimes(1)
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
