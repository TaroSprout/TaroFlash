import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { useAdminModal } from '@/composables/admin/use-admin-modal'
import AdminComponent from '@/views/admin/index.vue'

const { mockOpen } = vi.hoisted(() => ({
  mockOpen: vi.fn()
}))

vi.mock('@/composables/overlay/use-overlay', () => ({
  useOverlay: vi.fn(() => ({ open: mockOpen }))
}))

describe('useAdminModal — call shape', () => {
  beforeEach(() => {
    mockOpen.mockReset()
  })

  test('opens the Admin component as a dialog, with the open/close sfx wired through useOverlay', () => {
    mockOpen.mockReturnValueOnce({ result: Promise.resolve(undefined), close: vi.fn() })

    const { open } = useAdminModal()
    open()

    expect(mockOpen).toHaveBeenCalledWith(AdminComponent, {
      presentation: 'dialog',
      open_sfx: 'dialog.open',
      close_sfx: 'dialog.close'
    })
  })

  test('returns the { result, close } shape from useOverlay unchanged', () => {
    const returned_result = { result: Promise.resolve(undefined), close: vi.fn() }
    mockOpen.mockReturnValueOnce(returned_result)

    const { open } = useAdminModal()
    const returned = open()

    expect(returned).toBe(returned_result)
  })
})
