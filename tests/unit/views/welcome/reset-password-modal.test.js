import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { useResetPasswordModal } from '@/views/welcome/reset-password/reset-password-modal'
import ResetPasswordModal from '@/views/welcome/reset-password/index.vue'

const { mockOpen } = vi.hoisted(() => ({ mockOpen: vi.fn() }))

vi.mock('@/composables/modal', () => ({
  useModal: vi.fn(() => ({ open: mockOpen }))
}))

describe('useResetPasswordModal — call shape', () => {
  beforeEach(() => {
    mockOpen.mockReset()
  })

  test('opens the reset-password modal with mode popup and backdrop true', () => {
    mockOpen.mockReturnValueOnce({ response: Promise.resolve(undefined) })

    const { open } = useResetPasswordModal()
    open()

    expect(mockOpen).toHaveBeenCalledWith(ResetPasswordModal, {
      backdrop: true,
      mode: 'popup'
    })
  })

  test('returns the result of modal.open unchanged', () => {
    const result = { response: Promise.resolve(undefined) }
    mockOpen.mockReturnValueOnce(result)

    const { open } = useResetPasswordModal()
    const returned = open()

    expect(returned).toBe(result)
  })
})
