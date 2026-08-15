import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { useAdminModal } from '@/composables/admin/use-admin-modal'
import AdminComponent from '@/views/admin/index.vue'

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

describe('useAdminModal — call shape', () => {
  beforeEach(() => {
    mockOpen.mockReset()
    mockEmitSfx.mockClear()
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

  // ── sfx [obligation] ───────────────────────────────────────────────────────

  test('plays snappy_button_3 sfx synchronously when opening [obligation]', () => {
    mockOpen.mockReturnValueOnce({ response: Promise.resolve(undefined) })

    const { open } = useAdminModal()
    open()

    expect(mockEmitSfx).toHaveBeenCalledWith('snappy_button_3')
  })

  test('plays pop_up_close sfx once the modal resolves [obligation]', async () => {
    let resolve
    const response = new Promise((res) => {
      resolve = res
    })
    mockOpen.mockReturnValueOnce({ response })

    const { open } = useAdminModal()
    open()

    resolve(undefined)
    await response

    expect(mockEmitSfx).toHaveBeenCalledWith('pop_up_close')
  })
})
