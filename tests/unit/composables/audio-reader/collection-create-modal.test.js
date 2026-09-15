import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { useCollectionCreateModal } from '@/composables/audio-reader/collection-create-modal'
import CollectionCreate from '@/views/audio-reader/collection-create-modal.vue'

const { mockOpen } = vi.hoisted(() => ({ mockOpen: vi.fn() }))

vi.mock('@/composables/overlay/use-overlay', () => ({
  useOverlay: vi.fn(() => ({ open: mockOpen }))
}))

function makeOverlayResult(value) {
  return { result: Promise.resolve(value) }
}

describe('useCollectionCreateModal', () => {
  beforeEach(() => {
    mockOpen.mockReset()
  })

  test('opens with dialog presentation and the open/close sfx roles', () => {
    mockOpen.mockReturnValueOnce(makeOverlayResult(undefined))

    const { open } = useCollectionCreateModal()
    open()

    expect(mockOpen).toHaveBeenCalledWith(CollectionCreate, {
      presentation: 'dialog',
      open_sfx: 'dialog.open',
      close_sfx: 'dialog.close'
    })
  })

  test('returns the result of overlay.open unchanged', () => {
    const result = makeOverlayResult(undefined)
    mockOpen.mockReturnValueOnce(result)

    const { open } = useCollectionCreateModal()
    const returned = open()

    expect(returned).toBe(result)
  })
})
