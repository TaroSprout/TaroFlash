import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { useAdminModal } from '@/composables/admin/use-admin-modal'
import AdminComponent from '@/views/admin/index.vue'

const { mockOpen } = vi.hoisted(() => ({ mockOpen: vi.fn() }))

vi.mock('@/composables/modal', () => ({
  useModal: vi.fn(() => ({ open: mockOpen }))
}))

describe('useAdminModal — call shape', () => {
  beforeEach(() => {
    mockOpen.mockReset()
  })

  test('opens the Admin component with mode mobile-sheet, the mlg/md thresholds, and backdrop true', () => {
    mockOpen.mockReturnValueOnce({ response: Promise.resolve(undefined) })

    const { open } = useAdminModal()
    open()

    expect(mockOpen).toHaveBeenCalledWith(AdminComponent, {
      backdrop: true,
      mode: 'mobile-sheet',
      mobile_below_width: 'mlg',
      mobile_below_height: 'md'
    })
  })

  test('returns the result of modal.open unchanged', () => {
    const result = { response: Promise.resolve(undefined) }
    mockOpen.mockReturnValueOnce(result)

    const { open } = useAdminModal()
    const returned = open()

    expect(returned).toBe(result)
  })
})
