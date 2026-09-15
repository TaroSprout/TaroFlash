import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { useUploadLessonModal } from '@/composables/audio-reader/upload-lesson-modal'
import UploadLesson from '@/views/audio-reader/upload-lesson-modal/index.vue'

const { mockOpen } = vi.hoisted(() => ({ mockOpen: vi.fn() }))

vi.mock('@/composables/overlay/use-overlay', () => ({
  useOverlay: vi.fn(() => ({ open: mockOpen }))
}))

function makeOverlayResult(value) {
  return { result: Promise.resolve(value) }
}

describe('useUploadLessonModal', () => {
  beforeEach(() => {
    mockOpen.mockReset()
  })

  test('opens with the collection_id prop, dialog presentation, and the open/close sfx roles', () => {
    mockOpen.mockReturnValueOnce(makeOverlayResult(undefined))

    const { open } = useUploadLessonModal()
    open(42)

    expect(mockOpen).toHaveBeenCalledWith(UploadLesson, {
      props: { collection_id: 42 },
      presentation: 'dialog',
      open_sfx: 'dialog.open',
      close_sfx: 'dialog.close'
    })
  })

  test('returns the result of overlay.open unchanged', () => {
    const result = makeOverlayResult(undefined)
    mockOpen.mockReturnValueOnce(result)

    const { open } = useUploadLessonModal()
    const returned = open(1)

    expect(returned).toBe(result)
  })
})
