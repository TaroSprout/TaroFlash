import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { useFeedbackModal } from '@/composables/feedback/use-feedback-modal'
import FeedbackBoard from '@/components/feedback/feedback-board.vue'

const { mockOpen, mockEmitSfx } = vi.hoisted(() => ({
  mockOpen: vi.fn(),
  mockEmitSfx: vi.fn()
}))

vi.mock('@/composables/modal', () => ({
  useModal: vi.fn(() => ({ open: mockOpen }))
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx
}))

describe('useFeedbackModal — call shape [obligation]', () => {
  beforeEach(() => {
    mockOpen.mockReset()
    mockEmitSfx.mockClear()
  })

  test('opens FeedbackBoard with mode mobile-sheet, the msm/md thresholds, and backdrop true', () => {
    mockOpen.mockReturnValueOnce({ response: Promise.resolve(undefined) })

    const { open } = useFeedbackModal()
    open()

    expect(mockOpen).toHaveBeenCalledWith(FeedbackBoard, {
      backdrop: true,
      mode: 'mobile-sheet',
      mobile_below_width: 'msm',
      mobile_below_height: 'md'
    })
  })

  test('plays snappy_button_3 sfx synchronously when opening', () => {
    mockOpen.mockReturnValueOnce({ response: Promise.resolve(undefined) })

    const { open } = useFeedbackModal()
    open()

    expect(mockEmitSfx).toHaveBeenCalledWith('snappy_button_3')
  })

  test('plays pop_up_close sfx once the modal resolves', async () => {
    let resolve
    const response = new Promise((res) => {
      resolve = res
    })
    mockOpen.mockReturnValueOnce({ response })

    const { open } = useFeedbackModal()
    open()

    resolve(undefined)
    await response

    expect(mockEmitSfx).toHaveBeenCalledWith('pop_up_close')
  })

  test('returns the result of modal.open unchanged', () => {
    const result = { response: Promise.resolve(undefined) }
    mockOpen.mockReturnValueOnce(result)

    const { open } = useFeedbackModal()
    const returned = open()

    expect(returned).toBe(result)
  })
})
