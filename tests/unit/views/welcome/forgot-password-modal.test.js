import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { useForgotPasswordModal } from '@/views/welcome/forgot-password/forgot-password-modal'
import ForgotPasswordModal from '@/views/welcome/forgot-password/index.vue'

const { mockOpen } = vi.hoisted(() => ({ mockOpen: vi.fn() }))

vi.mock('@/composables/modal', () => ({
  useModal: vi.fn(() => ({ open: mockOpen }))
}))

describe('useForgotPasswordModal — call shape', () => {
  beforeEach(() => {
    mockOpen.mockReset()
  })

  test('opens the forgot-password modal with mode popup and backdrop true', () => {
    mockOpen.mockReturnValueOnce({ response: Promise.resolve(undefined) })

    const { open } = useForgotPasswordModal()
    open()

    expect(mockOpen).toHaveBeenCalledWith(ForgotPasswordModal, {
      backdrop: true,
      mode: 'popup'
    })
  })

  test('returns the result of modal.open unchanged', () => {
    const result = { response: Promise.resolve(undefined) }
    mockOpen.mockReturnValueOnce(result)

    const { open } = useForgotPasswordModal()
    const returned = open()

    expect(returned).toBe(result)
  })
})
