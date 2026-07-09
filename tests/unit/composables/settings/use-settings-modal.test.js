import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { useSettingsModal } from '@/composables/settings/use-settings-modal'
import { SETTINGS_SHEET_BREAKPOINTS } from '@/views/settings/layout'

const { mockOpen } = vi.hoisted(() => ({ mockOpen: vi.fn() }))

vi.mock('@/composables/modal', () => ({
  useModal: vi.fn(() => ({ open: mockOpen }))
}))

// SettingsComponent is imported as a raw .vue component — match on shape since
// the import reference differs from a re-read of the same module path.
const settingsComponentMatcher = expect.any(Object)

describe('useSettingsModal — call shape [obligation]', () => {
  beforeEach(() => {
    mockOpen.mockReset()
  })

  test('opens the settings component with mode mobile-sheet, the mobile thresholds, and backdrop true', () => {
    mockOpen.mockReturnValueOnce({ response: Promise.resolve(undefined) })

    const { open } = useSettingsModal()
    open()

    expect(mockOpen).toHaveBeenCalledWith(settingsComponentMatcher, {
      backdrop: true,
      mode: 'mobile-sheet',
      mobile_below_width: 'mlg',
      mobile_below_height: 'md'
    })
  })

  test('[obligation] sources the mobile thresholds from SETTINGS_SHEET_BREAKPOINTS, shared with the recede/restore pin check', () => {
    mockOpen.mockReturnValueOnce({ response: Promise.resolve(undefined) })

    const { open } = useSettingsModal()
    open()

    const [, opts] = mockOpen.mock.calls[0]
    expect(opts.mobile_below_width).toBe(SETTINGS_SHEET_BREAKPOINTS.width)
    expect(opts.mobile_below_height).toBe(SETTINGS_SHEET_BREAKPOINTS.height)
  })

  test('returns the result of modal.open unchanged', () => {
    const result = { response: Promise.resolve(undefined) }
    mockOpen.mockReturnValueOnce(result)

    const { open } = useSettingsModal()
    const returned = open()

    expect(returned).toBe(result)
  })
})
