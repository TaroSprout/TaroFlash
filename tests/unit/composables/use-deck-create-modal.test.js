import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { flushPromises } from '@vue/test-utils'
import { useDeckCreateModal } from '@/composables/deck/create-modal'
import DeckCreate from '@/components/modals/deck-create/index.vue'

const { mockEmitSfx, mockOpen } = vi.hoisted(() => ({
  mockEmitSfx: vi.fn(),
  mockOpen: vi.fn()
}))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))
vi.mock('@/composables/modal', () => ({
  useModal: vi.fn(() => ({ open: mockOpen }))
}))

function makeModalResult(value) {
  return { response: Promise.resolve(value) }
}

describe('useDeckCreateModal', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
    mockOpen.mockReset()
  })

  test('opens modal with backdrop and mobile-sheet mode (no props)', () => {
    mockOpen.mockReturnValueOnce(makeModalResult(undefined))

    useDeckCreateModal().open()

    expect(mockOpen).toHaveBeenCalledWith(DeckCreate, {
      backdrop: true,
      mode: 'mobile-sheet',
      mobile_below_width: 'md',
      mobile_below_height: 'md'
    })
  })

  test('plays the open sfx when called', () => {
    mockOpen.mockReturnValueOnce(makeModalResult(undefined))

    useDeckCreateModal().open()

    expect(mockEmitSfx).toHaveBeenCalled()
  })

  test('returns the modal handle unchanged so callers can await response', () => {
    const handle = makeModalResult(true)
    mockOpen.mockReturnValueOnce(handle)

    const returned = useDeckCreateModal().open()

    expect(returned).toBe(handle)
  })

  test('plays a close sfx after the modal resolves', async () => {
    mockOpen.mockReturnValueOnce(makeModalResult(undefined))

    useDeckCreateModal().open()
    const openSfxCount = mockEmitSfx.mock.calls.length

    await flushPromises()

    expect(mockEmitSfx.mock.calls.length).toBeGreaterThan(openSfxCount)
  })
})
