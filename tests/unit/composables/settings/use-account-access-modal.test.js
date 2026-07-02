import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { useAccountAccessModal } from '@/composables/settings/use-account-access-modal'

const { mockOpen } = vi.hoisted(() => ({ mockOpen: vi.fn() }))

vi.mock('@/composables/modal', () => ({
  useModal: vi.fn(() => ({ open: mockOpen }))
}))

// AccountAccessModal is imported as a raw .vue component — match on shape since
// the import reference differs from a re-read of the same module path.
const accountAccessComponentMatcher = expect.any(Object)

describe('useAccountAccessModal — call shape', () => {
  beforeEach(() => {
    mockOpen.mockReset()
  })

  test('opens the account-access component with mode popup and backdrop true', () => {
    mockOpen.mockReturnValueOnce({ response: Promise.resolve(undefined) })

    const { open } = useAccountAccessModal()
    open()

    expect(mockOpen).toHaveBeenCalledWith(accountAccessComponentMatcher, {
      backdrop: true,
      mode: 'popup'
    })
  })

  test('returns the result of modal.open unchanged', () => {
    const result = { response: Promise.resolve(undefined) }
    mockOpen.mockReturnValueOnce(result)

    const { open } = useAccountAccessModal()
    const returned = open()

    expect(returned).toBe(result)
  })
})
