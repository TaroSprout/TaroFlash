import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { flushPromises } from '@vue/test-utils'
import { useDeckSettingsModal } from '@/composables/deck/settings-modal'

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
const { mockOpen } = vi.hoisted(() => ({ mockOpen: vi.fn() }))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

vi.mock('@/composables/modal', () => ({
  useModal: vi.fn(() => ({ open: mockOpen }))
}))

// DeckSettings is wrapped with defineAsyncComponent inside the composable, so
// the component identity doesn't match the raw .vue import. Assert on shape.
const asyncComponentMatcher = expect.objectContaining({ __asyncLoader: expect.any(Function) })

function makeModalResult(value) {
  return { response: Promise.resolve(value) }
}

describe('useDeckSettingsModal', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
    mockOpen.mockReset()
  })

  test('plays camera-reel sfx when opening', () => {
    mockOpen.mockReturnValueOnce(makeModalResult(undefined))

    const { open } = useDeckSettingsModal()
    open({ id: 1 })

    expect(mockEmitSfx).toHaveBeenCalled()
  })

  test('opens modal with backdrop, mobile-sheet mode, mobile thresholds, and the deck prop', () => {
    const deck = { id: 42, title: 'A' }
    mockOpen.mockReturnValueOnce(makeModalResult(undefined))

    const { open } = useDeckSettingsModal()
    open(deck)

    expect(mockOpen).toHaveBeenCalledWith(asyncComponentMatcher, {
      backdrop: true,
      mode: 'mobile-sheet',
      mobile_below_width: 'md',
      mobile_below_height: 'md',
      props: { deck, initial_tab: undefined, initial_side: undefined }
    })
  })

  test('open(deck, { tab, side }) forwards tab as initial_tab and side as initial_side in props [obligation]', () => {
    const deck = { id: 7 }
    mockOpen.mockReturnValueOnce(makeModalResult(undefined))

    const { open } = useDeckSettingsModal()
    open(deck, { tab: 'design', side: 'front' })

    expect(mockOpen).toHaveBeenCalledWith(
      asyncComponentMatcher,
      expect.objectContaining({
        props: expect.objectContaining({ initial_tab: 'design', initial_side: 'front' })
      })
    )
  })

  test('open(deck) with no options passes undefined for initial_tab and initial_side [obligation]', () => {
    const deck = { id: 8 }
    mockOpen.mockReturnValueOnce(makeModalResult(undefined))

    const { open } = useDeckSettingsModal()
    open(deck)

    expect(mockOpen).toHaveBeenCalledWith(
      asyncComponentMatcher,
      expect.objectContaining({
        props: expect.objectContaining({ initial_tab: undefined, initial_side: undefined })
      })
    )
  })

  test('open(deck, { tab }) forwards tab but leaves initial_side undefined [obligation]', () => {
    const deck = { id: 9 }
    mockOpen.mockReturnValueOnce(makeModalResult(undefined))

    const { open } = useDeckSettingsModal()
    open(deck, { tab: 'study' })

    expect(mockOpen).toHaveBeenCalledWith(
      asyncComponentMatcher,
      expect.objectContaining({
        props: expect.objectContaining({ initial_tab: 'study', initial_side: undefined })
      })
    )
  })

  test('returns the result of modal.open unchanged', () => {
    const result = makeModalResult('x')
    mockOpen.mockReturnValueOnce(result)

    const { open } = useDeckSettingsModal()
    const returned = open({ id: 1 })

    expect(returned).toBe(result)
  })

  test('plays card-drop sfx after the modal closes', async () => {
    mockOpen.mockReturnValueOnce(makeModalResult(undefined))

    const { open } = useDeckSettingsModal()
    open({ id: 1 })
    const openSfxCount = mockEmitSfx.mock.calls.length

    await flushPromises()

    expect(mockEmitSfx.mock.calls.length).toBeGreaterThan(openSfxCount)
  })
})
