import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { flushPromises } from '@vue/test-utils'
import { useCollectionCreateModal } from '@/composables/audio-reader/collection-create-modal'
import CollectionCreate from '@/views/audio-reader/collection-create-modal.vue'

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
const { mockOpen } = vi.hoisted(() => ({ mockOpen: vi.fn() }))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

vi.mock('@/composables/modal', () => ({
  useModal: vi.fn(() => ({ open: mockOpen }))
}))

function makeModalResult(value) {
  return { response: Promise.resolve(value) }
}

describe('useCollectionCreateModal', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
    mockOpen.mockReset()
  })

  test('plays dialog.open sfx when opening', () => {
    mockOpen.mockReturnValueOnce(makeModalResult(undefined))

    const { open } = useCollectionCreateModal()
    open()

    expect(mockEmitSfx).toHaveBeenCalledWith('dialog.open')
  })

  test('opens the modal with backdrop and mobile-sheet mode', () => {
    mockOpen.mockReturnValueOnce(makeModalResult(undefined))

    const { open } = useCollectionCreateModal()
    open()

    expect(mockOpen).toHaveBeenCalledWith(CollectionCreate, {
      backdrop: true,
      mode: 'mobile-sheet'
    })
  })

  test('plays dialog.close sfx once the modal response resolves', async () => {
    mockOpen.mockReturnValueOnce(makeModalResult(undefined))

    const { open } = useCollectionCreateModal()
    open()
    const openSfxCount = mockEmitSfx.mock.calls.length

    await flushPromises()

    expect(mockEmitSfx.mock.calls.length).toBeGreaterThan(openSfxCount)
    expect(mockEmitSfx).toHaveBeenLastCalledWith('dialog.close')
  })

  test('returns the result of modal.open unchanged', () => {
    const result = makeModalResult(undefined)
    mockOpen.mockReturnValueOnce(result)

    const { open } = useCollectionCreateModal()
    const returned = open()

    expect(returned).toBe(result)
  })
})
