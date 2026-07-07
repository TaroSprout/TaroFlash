import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { useForgotPasswordModal } from '@/views/welcome/forgot-password/forgot-password-modal'

const { mockOpen } = vi.hoisted(() => ({ mockOpen: vi.fn() }))

vi.mock('@/composables/modal', () => ({
  useModal: vi.fn(() => ({ open: mockOpen }))
}))

// ForgotPasswordModal is wrapped in defineAsyncComponent inside the composable —
// assert on the async component wrapper shape rather than the raw .vue import.
const asyncComponentMatcher = expect.objectContaining({ __asyncLoader: expect.any(Function) })

describe('useForgotPasswordModal — call shape', () => {
  beforeEach(() => {
    mockOpen.mockReset()
  })

  test('opens the forgot-password modal with mode popup and backdrop true', () => {
    mockOpen.mockReturnValueOnce({ response: Promise.resolve(undefined) })

    const { open } = useForgotPasswordModal()
    open()

    expect(mockOpen).toHaveBeenCalledWith(asyncComponentMatcher, {
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
