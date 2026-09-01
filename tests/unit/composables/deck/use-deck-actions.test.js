import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { upsertMock, canCreateDeck, mockWarn, mockModalOpen, mockNoticeError } = vi.hoisted(() => ({
  upsertMock: vi.fn(),
  canCreateDeck: { value: true },
  mockWarn: vi.fn(),
  mockModalOpen: vi.fn(),
  mockNoticeError: vi.fn()
}))

vi.mock('@/api/decks', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useUpsertDeckMutation: () => ({ mutate: upsertMock, mutateAsync: upsertMock })
  }
})

vi.mock('@/composables/can', () => ({
  useCan: () => ({ createDeck: canCreateDeck })
}))

vi.mock('@/composables/alert', () => ({
  useAlert: () => ({ warn: mockWarn })
}))

vi.mock('@/composables/modal', () => ({
  useModal: () => ({ open: mockModalOpen })
}))

vi.mock('@/stores/notice-store', () => ({
  useNoticeStore: () => ({ error: mockNoticeError })
}))

vi.mock('@/components/billing/checkout-modal/index.vue', () => ({
  default: { name: 'Checkout' }
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key) => key })
}))

import { useDeckActions } from '@/composables/deck/actions'
import { DeckLimitError } from '@/api/decks/mutations/upsert'

function makeAlertResponse(promise = Promise.resolve(undefined)) {
  return { response: promise }
}

describe('useDeckActions', () => {
  beforeEach(() => {
    upsertMock.mockReset()
    upsertMock.mockResolvedValue({ id: 1, title: 'Saved Deck' })
    mockWarn.mockReset()
    mockWarn.mockReturnValue(makeAlertResponse())
    mockModalOpen.mockClear()
    mockNoticeError.mockClear()
    canCreateDeck.value = true
  })

  describe('guardCreateDeck', () => {
    test('shows the upgrade alert, returns nothing (Promise<void>)', async () => {
      const { guardCreateDeck } = useDeckActions()
      const result = await guardCreateDeck()

      expect(result).toBeUndefined()
      expect(mockWarn).toHaveBeenCalledWith({
        title: 'errors.deck-limit-reached.title',
        message: 'errors.deck-limit-reached.message',
        confirmLabel: 'errors.deck-limit-reached.upgrade-cta'
      })
    })

    test('opens checkout modal (mobile-sheet, backdrop) when the member confirms upgrade', async () => {
      mockWarn.mockReturnValue(makeAlertResponse(Promise.resolve(true)))

      const { guardCreateDeck } = useDeckActions()
      await guardCreateDeck()

      expect(mockModalOpen).toHaveBeenCalledWith(expect.objectContaining({ name: 'Checkout' }), {
        mode: 'mobile-sheet',
        backdrop: true
      })
    })

    test('opens nothing when the member dismisses the alert', async () => {
      mockWarn.mockReturnValue(makeAlertResponse(Promise.resolve(false)))

      const { guardCreateDeck } = useDeckActions()
      await guardCreateDeck()

      expect(mockModalOpen).not.toHaveBeenCalled()
    })
  })

  describe('createDeck', () => {
    test('upserts the deck and returns the saved row when the cached check passes', async () => {
      canCreateDeck.value = true
      upsertMock.mockResolvedValueOnce({ id: 7, title: 'New Deck' })
      const { createDeck } = useDeckActions()
      const result = await createDeck({ title: 'New Deck' })

      expect(upsertMock).toHaveBeenCalledWith({ title: 'New Deck' })
      expect(result).toEqual({ id: 7, title: 'New Deck' })
    })

    test('is called with a single argument, no options object', async () => {
      const { createDeck } = useDeckActions()
      // A second arg was the pre-refactor CreateDeckOptions shape — assert the
      // call site under test only ever passes the deck.
      await createDeck({ title: 'New Deck' })
      expect(upsertMock).toHaveBeenCalledWith({ title: 'New Deck' })
    })

    describe('cached can.createDeck is false — sync precheck branch', () => {
      test('calls guardCreateDeck (alert only) and returns null, without calling the mutation', async () => {
        canCreateDeck.value = false
        const { createDeck } = useDeckActions()
        const result = await createDeck({ title: 'Blocked Deck' })

        expect(upsertMock).not.toHaveBeenCalled()
        expect(mockWarn).toHaveBeenCalledTimes(1)
        expect(result).toBeNull()
      })

      test('does not fire the generic error notice', async () => {
        canCreateDeck.value = false
        const { createDeck } = useDeckActions()
        await createDeck({ title: 'Blocked Deck' })

        expect(mockNoticeError).not.toHaveBeenCalled()
      })
    })

    describe('cached check passes but the mutation throws DeckLimitError — recheck-throw branch', () => {
      test('calls guardCreateDeck again and returns null', async () => {
        canCreateDeck.value = true
        upsertMock.mockRejectedValueOnce(new DeckLimitError())
        const { createDeck } = useDeckActions()

        const result = await createDeck({ title: 'New Deck' })

        expect(result).toBeNull()
        expect(mockWarn).toHaveBeenCalledTimes(1)
      })

      test('does NOT fire the generic deck-create-failed notice', async () => {
        canCreateDeck.value = true
        upsertMock.mockRejectedValueOnce(new DeckLimitError())
        const { createDeck } = useDeckActions()

        await createDeck({ title: 'New Deck' })

        expect(mockNoticeError).not.toHaveBeenCalled()
      })
    })

    describe('any other throw', () => {
      test('fires the generic error notice and does NOT call guardCreateDeck', async () => {
        canCreateDeck.value = true
        upsertMock.mockRejectedValueOnce(new Error('boom'))
        const { createDeck } = useDeckActions()

        const result = await createDeck({ title: 'New Deck' })

        expect(result).toBeNull()
        expect(mockNoticeError).toHaveBeenCalledWith('toast.error.deck-create-failed')
        expect(mockWarn).not.toHaveBeenCalled()
      })
    })
  })

  describe('updateDeck', () => {
    test('upserts without running the guard and returns the saved row', async () => {
      canCreateDeck.value = false // guard would block create — prove update bypasses it
      upsertMock.mockResolvedValueOnce({ id: 1, title: 'Updated' })
      const { updateDeck } = useDeckActions()
      const result = await updateDeck({ id: 1, title: 'Updated' })

      expect(mockWarn).not.toHaveBeenCalled()
      expect(upsertMock).toHaveBeenCalledWith({ id: 1, title: 'Updated' })
      expect(result).toEqual({ id: 1, title: 'Updated' })
    })

    test('returns null instead of throwing when the mutation rejects', async () => {
      upsertMock.mockRejectedValueOnce(new Error('boom'))
      const { updateDeck } = useDeckActions()

      await expect(updateDeck({ id: 1, title: 'Updated' })).resolves.toBeNull()
    })
  })
})
