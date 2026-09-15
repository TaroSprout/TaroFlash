import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { useCollectionEditModal } from '@/composables/audio-reader/collection-edit-modal'
import CollectionEdit from '@/views/audio-reader/collection-edit-modal.vue'

const { mockOpen } = vi.hoisted(() => ({ mockOpen: vi.fn() }))

vi.mock('@/composables/overlay/use-overlay', () => ({
  useOverlay: vi.fn(() => ({ open: mockOpen }))
}))

function makeOverlayResult(value) {
  return { result: Promise.resolve(value) }
}

describe('useCollectionEditModal', () => {
  beforeEach(() => {
    mockOpen.mockReset()
  })

  test('opens with the collection_id prop, dialog presentation, and the open/close sfx roles', () => {
    mockOpen.mockReturnValueOnce(makeOverlayResult(undefined))

    const { open } = useCollectionEditModal()
    open(42)

    expect(mockOpen).toHaveBeenCalledWith(CollectionEdit, {
      props: { collection_id: 42 },
      presentation: 'dialog',
      open_sfx: 'dialog.open',
      close_sfx: 'dialog.close'
    })
  })

  test('returns the result of overlay.open unchanged', () => {
    const result = makeOverlayResult(undefined)
    mockOpen.mockReturnValueOnce(result)

    const { open } = useCollectionEditModal()
    const returned = open(1)

    expect(returned).toBe(result)
  })
})
