import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { useResetPasswordModal } from '@/views/welcome/reset-password/reset-password-modal'
import ResetPasswordModal from '@/views/welcome/reset-password/index.vue'

const { mockOpen } = vi.hoisted(() => ({ mockOpen: vi.fn() }))

vi.mock('@/composables/overlay/use-overlay', () => ({
  useOverlay: vi.fn(() => ({ open: mockOpen }))
}))

describe('useResetPasswordModal — call shape', () => {
  beforeEach(() => {
    mockOpen.mockReset()
  })

  test('opens the reset-password modal with popup presentation', () => {
    mockOpen.mockReturnValueOnce({ result: Promise.resolve(undefined) })

    const { open } = useResetPasswordModal()
    open()

    expect(mockOpen).toHaveBeenCalledWith(ResetPasswordModal, {
      presentation: 'popup'
    })
  })

  test('returns the result of overlay.open unchanged', () => {
    const result = { result: Promise.resolve(undefined) }
    mockOpen.mockReturnValueOnce(result)

    const { open } = useResetPasswordModal()
    const returned = open()

    expect(returned).toBe(result)
  })
})
