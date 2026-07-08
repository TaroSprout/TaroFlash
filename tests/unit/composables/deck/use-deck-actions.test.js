import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { refreshMock, upsertMock, canCreateDeck, mockWarn, mockModalOpen } = vi.hoisted(() => ({
  refreshMock: vi.fn().mockResolvedValue(undefined),
  upsertMock: vi.fn(),
  canCreateDeck: { value: true },
  mockWarn: vi.fn(),
  mockModalOpen: vi.fn()
}))

vi.mock('@/api/decks', () => ({
  useMemberDeckCountQuery: () => ({ refresh: refreshMock, data: { value: 0 } }),
  useUpsertDeckMutation: () => ({ mutate: upsertMock, mutateAsync: upsertMock })
}))

vi.mock('@/composables/can', () => ({
  useCan: () => ({ createDeck: canCreateDeck })
}))

vi.mock('@/composables/alert', () => ({
  useAlert: () => ({ warn: mockWarn })
}))

vi.mock('@/composables/modal', () => ({
  useModal: () => ({ open: mockModalOpen })
}))

vi.mock('@/components/modals/checkout/index.vue', () => ({
  default: { name: 'Checkout' }
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key) => key })
}))

import { useDeckActions } from '@/composables/deck/actions'

function makeAlertResponse(promise = Promise.resolve(undefined)) {
  return { response: promise }
}

describe('useDeckActions', () => {
  beforeEach(() => {
    refreshMock.mockClear()
    upsertMock.mockClear()
    upsertMock.mockResolvedValue({ id: 1, title: 'Saved Deck' })
    mockWarn.mockReset()
    mockWarn.mockReturnValue(makeAlertResponse())
    mockModalOpen.mockClear()
    canCreateDeck.value = true
  })

  describe('guardCreateDeck', () => {
    test('refreshes the deck-count query before checking capability', async () => {
      const { guardCreateDeck } = useDeckActions()
      await guardCreateDeck()
      expect(refreshMock).toHaveBeenCalledTimes(1)
    })

    test('returns true when allowed, without prompting', async () => {
      canCreateDeck.value = true
      const { guardCreateDeck } = useDeckActions()
      const result = await guardCreateDeck()
      expect(result).toBe(true)
      expect(mockWarn).not.toHaveBeenCalled()
      expect(mockModalOpen).not.toHaveBeenCalled()
    })

    test('shows the upgrade alert when blocked', async () => {
      canCreateDeck.value = false
      const { guardCreateDeck } = useDeckActions()
      await guardCreateDeck()
      expect(mockWarn).toHaveBeenCalledWith({
        title: 'errors.deck-limit-reached.title',
        message: 'errors.deck-limit-reached.message',
        confirmLabel: 'errors.deck-limit-reached.upgrade-cta'
      })
    })

    test('opens checkout modal when user confirms upgrade', async () => {
      canCreateDeck.value = false
      mockWarn.mockReturnValue(makeAlertResponse(Promise.resolve(true)))

      const { guardCreateDeck } = useDeckActions()
      const result = await guardCreateDeck()

      expect(result).toBe(false)
      expect(mockModalOpen).toHaveBeenCalledWith(expect.objectContaining({ name: 'Checkout' }), {
        mode: 'mobile-sheet',
        backdrop: true
      })
    })

    test('does not open checkout when user cancels the alert', async () => {
      canCreateDeck.value = false
      mockWarn.mockReturnValue(makeAlertResponse(Promise.resolve(false)))

      const { guardCreateDeck } = useDeckActions()
      const result = await guardCreateDeck()

      expect(result).toBe(false)
      expect(mockModalOpen).not.toHaveBeenCalled()
    })
  })

  describe('createDeck', () => {
    test('upserts the deck and returns the saved row when guard passes', async () => {
      canCreateDeck.value = true
      upsertMock.mockResolvedValueOnce({ id: 7, title: 'New Deck' })
      const { createDeck } = useDeckActions()
      const result = await createDeck({ title: 'New Deck' })

      expect(upsertMock).toHaveBeenCalledWith({ title: 'New Deck' })
      expect(result).toEqual({ id: 7, title: 'New Deck' })
    })

    test('returns null and skips upsert when guard blocks', async () => {
      canCreateDeck.value = false
      const { createDeck } = useDeckActions()
      const result = await createDeck({ title: 'Blocked Deck' })

      expect(upsertMock).not.toHaveBeenCalled()
      expect(result).toBeNull()
    })

    test('returns null instead of throwing when the mutation rejects [obligation]', async () => {
      canCreateDeck.value = true
      upsertMock.mockRejectedValueOnce(new Error('boom'))
      const { createDeck } = useDeckActions()

      await expect(createDeck({ title: 'New Deck' })).resolves.toBeNull()
    })
  })

  describe('updateDeck', () => {
    test('upserts without running the guard and returns the saved row', async () => {
      canCreateDeck.value = false // guard would block — prove update bypasses it
      upsertMock.mockResolvedValueOnce({ id: 1, title: 'Updated' })
      const { updateDeck } = useDeckActions()
      const result = await updateDeck({ id: 1, title: 'Updated' })

      expect(refreshMock).not.toHaveBeenCalled()
      expect(mockWarn).not.toHaveBeenCalled()
      expect(upsertMock).toHaveBeenCalledWith({ id: 1, title: 'Updated' })
      expect(result).toEqual({ id: 1, title: 'Updated' })
    })

    test('returns null instead of throwing when the mutation rejects [obligation]', async () => {
      upsertMock.mockRejectedValueOnce(new Error('boom'))
      const { updateDeck } = useDeckActions()

      await expect(updateDeck({ id: 1, title: 'Updated' })).resolves.toBeNull()
    })
  })
})
