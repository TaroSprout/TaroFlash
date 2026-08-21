import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { flushPromises } from '@vue/test-utils'
import { useCollectionEditModal } from '@/composables/audio-reader/collection-edit-modal'
import CollectionEdit from '@/views/audio-reader/collection-edit-modal.vue'

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
const { mockOpen } = vi.hoisted(() => ({ mockOpen: vi.fn() }))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

vi.mock('@/composables/modal', () => ({
  useModal: vi.fn(() => ({ open: mockOpen }))
}))

function makeModalResult(value) {
  return { response: Promise.resolve(value) }
}

describe('useCollectionEditModal', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
    mockOpen.mockReset()
  })

  test('plays dialog.open sfx when opening', () => {
    mockOpen.mockReturnValueOnce(makeModalResult(undefined))

    const { open } = useCollectionEditModal()
    open(1)

    expect(mockEmitSfx).toHaveBeenCalledWith('dialog.open')
  })

  test('opens the modal with the collection_id prop, backdrop, and mobile-sheet mode', () => {
    mockOpen.mockReturnValueOnce(makeModalResult(undefined))

    const { open } = useCollectionEditModal()
    open(42)

    expect(mockOpen).toHaveBeenCalledWith(CollectionEdit, {
      props: { collection_id: 42 },
      backdrop: true,
      mode: 'mobile-sheet'
    })
  })

  test('plays dialog.close sfx once the modal response resolves', async () => {
    mockOpen.mockReturnValueOnce(makeModalResult(undefined))

    const { open } = useCollectionEditModal()
    open(1)
    const openSfxCount = mockEmitSfx.mock.calls.length

    await flushPromises()

    expect(mockEmitSfx.mock.calls.length).toBeGreaterThan(openSfxCount)
    expect(mockEmitSfx).toHaveBeenLastCalledWith('dialog.close')
  })

  test('returns the result of modal.open unchanged', () => {
    const result = makeModalResult(undefined)
    mockOpen.mockReturnValueOnce(result)

    const { open } = useCollectionEditModal()
    const returned = open(1)

    expect(returned).toBe(result)
  })
})
