import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { useDeckSettingsModal } from '@/composables/deck/settings-modal'
import DeckSettings from '@/views/deck/deck-settings/index.vue'

const { mockOpen } = vi.hoisted(() => ({ mockOpen: vi.fn() }))

vi.mock('@/composables/overlay/use-overlay', () => ({
  useOverlay: vi.fn(() => ({ open: mockOpen }))
}))

function makeOverlayResult(value) {
  return { result: Promise.resolve(value), close: vi.fn() }
}

describe('useDeckSettingsModal', () => {
  beforeEach(() => {
    mockOpen.mockReset()
  })

  test('opens with dialog presentation, open/close sfx roles, and the deck prop', () => {
    const deck = { id: 42, title: 'A' }
    mockOpen.mockReturnValueOnce(makeOverlayResult(undefined))

    const { open } = useDeckSettingsModal()
    open(deck)

    expect(mockOpen).toHaveBeenCalledWith(DeckSettings, {
      presentation: 'dialog',
      open_sfx: 'dialog.open',
      close_sfx: 'dialog.close',
      props: { deck, initial_page: undefined, initial_side: undefined }
    })
  })

  test('open(deck, { tab, side }) forwards tab as initial_page and side as initial_side in props', () => {
    const deck = { id: 7 }
    mockOpen.mockReturnValueOnce(makeOverlayResult(undefined))

    const { open } = useDeckSettingsModal()
    open(deck, { tab: 'design', side: 'front' })

    expect(mockOpen).toHaveBeenCalledWith(
      DeckSettings,
      expect.objectContaining({
        props: expect.objectContaining({ initial_page: 'design', initial_side: 'front' })
      })
    )
  })

  test('open(deck) with no options passes undefined for initial_page and initial_side', () => {
    const deck = { id: 8 }
    mockOpen.mockReturnValueOnce(makeOverlayResult(undefined))

    const { open } = useDeckSettingsModal()
    open(deck)

    expect(mockOpen).toHaveBeenCalledWith(
      DeckSettings,
      expect.objectContaining({
        props: expect.objectContaining({ initial_page: undefined, initial_side: undefined })
      })
    )
  })

  test('open(deck, { tab }) forwards tab but leaves initial_side undefined', () => {
    const deck = { id: 9 }
    mockOpen.mockReturnValueOnce(makeOverlayResult(undefined))

    const { open } = useDeckSettingsModal()
    open(deck, { tab: 'review-pacing' })

    expect(mockOpen).toHaveBeenCalledWith(
      DeckSettings,
      expect.objectContaining({
        props: expect.objectContaining({ initial_page: 'review-pacing', initial_side: undefined })
      })
    )
  })

  test('returns the result of overlay.open unchanged', () => {
    const result = makeOverlayResult('x')
    mockOpen.mockReturnValueOnce(result)

    const { open } = useDeckSettingsModal()
    const returned = open({ id: 1 })

    expect(returned).toBe(result)
  })
})
