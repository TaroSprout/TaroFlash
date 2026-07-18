import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { mockAlert } = vi.hoisted(() => ({ mockAlert: { warn: vi.fn() } }))
const { mockNotice } = vi.hoisted(() => ({ mockNotice: { error: vi.fn() } }))
const { mockDeleteMutation } = vi.hoisted(() => ({
  mockDeleteMutation: { mutateAsync: vi.fn() }
}))
const { mockSettingsModal } = vi.hoisted(() => ({ mockSettingsModal: { open: vi.fn() } }))

vi.mock('@/composables/alert', () => ({ useAlert: () => mockAlert }))
vi.mock('@/stores/notice-store', () => ({ useNoticeStore: () => mockNotice }))
vi.mock('@/api/decks', () => ({ useDeleteDeckMutation: () => mockDeleteMutation }))
vi.mock('@/composables/deck/settings-modal', () => ({
  useDeckSettingsModal: () => mockSettingsModal
}))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }))

import { useDeckOptionsMenu } from '@/views/dashboard/composables/deck-options-menu'

const DECK = { id: 7, title: 'Test Deck' }

function confirmResponse(value) {
  mockAlert.warn.mockReturnValueOnce({ response: Promise.resolve(value) })
}

beforeEach(() => {
  mockAlert.warn.mockReset()
  mockNotice.error.mockReset()
  mockDeleteMutation.mutateAsync.mockReset().mockResolvedValue(undefined)
  mockSettingsModal.open.mockReset()
})

describe('useDeckOptionsMenu — options [obligation]', () => {
  test('exposes exactly settings, rearrange, and delete, in that order', () => {
    const { options } = useDeckOptionsMenu({ onRearrange: vi.fn() })
    expect(options.value.map((o) => o.value)).toEqual(['settings', 'rearrange', 'delete'])
  })
})

describe('useDeckOptionsMenu — onSelect dispatch [obligation]', () => {
  test('settings option opens the settings modal with the deck', () => {
    const { onSelect } = useDeckOptionsMenu({ onRearrange: vi.fn() })
    onSelect({ label: 'Settings', value: 'settings' }, DECK)
    expect(mockSettingsModal.open).toHaveBeenCalledWith(DECK)
  })

  test('rearrange option calls the onRearrange callback', () => {
    const onRearrange = vi.fn()
    const { onSelect } = useDeckOptionsMenu({ onRearrange })
    onSelect({ label: 'Rearrange', value: 'rearrange' }, DECK)
    expect(onRearrange).toHaveBeenCalledTimes(1)
  })

  test('delete option opens a confirm alert before mutating', () => {
    const { onSelect } = useDeckOptionsMenu({ onRearrange: vi.fn() })
    confirmResponse(false)
    onSelect({ label: 'Delete', value: 'delete' }, DECK)
    expect(mockAlert.warn).toHaveBeenCalledTimes(1)
  })
})

describe('useDeckOptionsMenu — delete confirm flow [obligation]', () => {
  test('declined confirm does not call the delete mutation', async () => {
    const { onSelect } = useDeckOptionsMenu({ onRearrange: vi.fn() })
    confirmResponse(false)

    onSelect({ label: 'Delete', value: 'delete' }, DECK)
    await Promise.resolve()
    await Promise.resolve()

    expect(mockDeleteMutation.mutateAsync).not.toHaveBeenCalled()
  })

  test('confirmed delete calls useDeleteDeckMutation with the deck id', async () => {
    const { onSelect } = useDeckOptionsMenu({ onRearrange: vi.fn() })
    confirmResponse(true)

    onSelect({ label: 'Delete', value: 'delete' }, DECK)
    await Promise.resolve()
    await Promise.resolve()

    expect(mockDeleteMutation.mutateAsync).toHaveBeenCalledWith(DECK.id)
  })

  test('mutation rejection shows an error notice (no post-delete navigation) [obligation]', async () => {
    mockDeleteMutation.mutateAsync.mockRejectedValueOnce(new Error('network'))
    const { onSelect } = useDeckOptionsMenu({ onRearrange: vi.fn() })
    confirmResponse(true)

    onSelect({ label: 'Delete', value: 'delete' }, DECK)
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    expect(mockNotice.error).toHaveBeenCalledWith(
      'toast.error.deck-delete-failed',
      expect.objectContaining({ variant: 'panel' })
    )
  })

  test('successful delete does not show an error notice', async () => {
    const { onSelect } = useDeckOptionsMenu({ onRearrange: vi.fn() })
    confirmResponse(true)

    onSelect({ label: 'Delete', value: 'delete' }, DECK)
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    expect(mockNotice.error).not.toHaveBeenCalled()
  })
})
