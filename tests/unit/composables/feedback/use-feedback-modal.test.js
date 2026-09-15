import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { useFeedbackModal } from '@/composables/feedback/use-feedback-modal'
import FeedbackBoard from '@/components/feedback/feedback-board.vue'

const { mockOpen } = vi.hoisted(() => ({ mockOpen: vi.fn() }))

vi.mock('@/composables/overlay/use-overlay', () => ({
  useOverlay: vi.fn(() => ({ open: mockOpen }))
}))

describe('useFeedbackModal — call shape', () => {
  beforeEach(() => {
    mockOpen.mockReset()
  })

  test('opens FeedbackBoard with dialog presentation and the open/close sfx roles', () => {
    mockOpen.mockReturnValueOnce({ result: Promise.resolve(undefined) })

    const { open } = useFeedbackModal()
    open()

    expect(mockOpen).toHaveBeenCalledWith(FeedbackBoard, {
      presentation: 'dialog',
      open_sfx: 'dialog.open',
      close_sfx: 'dialog.close'
    })
  })

  test('returns the result of overlay.open unchanged', () => {
    const result = { result: Promise.resolve(undefined) }
    mockOpen.mockReturnValueOnce(result)

    const { open } = useFeedbackModal()
    const returned = open()

    expect(returned).toBe(result)
  })
})
