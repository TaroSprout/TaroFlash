import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { useForgotPasswordModal } from '@/views/welcome/forgot-password/forgot-password-modal'
import ForgotPasswordModal from '@/views/welcome/forgot-password/index.vue'

const { mockOpen } = vi.hoisted(() => ({ mockOpen: vi.fn() }))

vi.mock('@/composables/overlay/use-overlay', () => ({
  useOverlay: vi.fn(() => ({ open: mockOpen }))
}))

describe('useForgotPasswordModal — call shape', () => {
  beforeEach(() => {
    mockOpen.mockReset()
  })

  test('opens the forgot-password modal with popup presentation', () => {
    mockOpen.mockReturnValueOnce({ result: Promise.resolve(undefined) })

    const { open } = useForgotPasswordModal()
    open()

    expect(mockOpen).toHaveBeenCalledWith(ForgotPasswordModal, {
      presentation: 'popup'
    })
  })

  test('returns the result of overlay.open unchanged', () => {
    const result = { result: Promise.resolve(undefined) }
    mockOpen.mockReturnValueOnce(result)

    const { open } = useForgotPasswordModal()
    const returned = open()

    expect(returned).toBe(result)
  })
})
