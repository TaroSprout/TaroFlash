import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { useSettingsModal } from '@/composables/settings/use-settings-modal'

const { mockOpen } = vi.hoisted(() => ({ mockOpen: vi.fn() }))

vi.mock('@/composables/overlay/use-overlay', () => ({
  useOverlay: vi.fn(() => ({ open: mockOpen }))
}))

// SettingsComponent is imported as a raw .vue component — match on shape since
// the import reference differs from a re-read of the same module path.
const settingsComponentMatcher = expect.any(Object)

describe('useSettingsModal — call shape', () => {
  beforeEach(() => {
    mockOpen.mockReset()
  })

  test('opens the settings component with dialog presentation', () => {
    mockOpen.mockReturnValueOnce({ result: Promise.resolve(undefined) })

    const { open } = useSettingsModal()
    open()

    expect(mockOpen).toHaveBeenCalledWith(settingsComponentMatcher, { presentation: 'dialog' })
  })

  test('returns the result of overlay.open unchanged', () => {
    const result = { result: Promise.resolve(undefined) }
    mockOpen.mockReturnValueOnce(result)

    const { open } = useSettingsModal()
    const returned = open()

    expect(returned).toBe(result)
  })
})
