import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { useAdvancedPacingModal } from '@/views/deck/deck-settings/tab-review-pacing/use-advanced-pacing-modal'

const { mockOpen } = vi.hoisted(() => ({ mockOpen: vi.fn() }))

vi.mock('@/composables/modal', () => ({
  useModal: vi.fn(() => ({ open: mockOpen }))
}))

// AdvancedPacingModal is imported as a raw .vue component — match on shape
// since the import reference differs from a re-read of the same module path.
const advancedPacingModalComponentMatcher = expect.any(Object)

describe('useAdvancedPacingModal — call shape', () => {
  beforeEach(() => {
    mockOpen.mockReset()
  })

  test('opens the advanced-pacing-modal component with the deck and pacing props, backdrop true, mode popup', () => {
    mockOpen.mockReturnValueOnce({ response: Promise.resolve(undefined) })
    const deck = { id: 1 }
    const pacing = { preset_id: null }

    const { open } = useAdvancedPacingModal()
    open(deck, pacing)

    expect(mockOpen).toHaveBeenCalledWith(advancedPacingModalComponentMatcher, {
      props: { deck, pacing },
      backdrop: true,
      mode: 'popup'
    })
  })

  test('returns the result of modal.open unchanged', () => {
    const result = { response: Promise.resolve(undefined) }
    mockOpen.mockReturnValueOnce(result)

    const { open } = useAdvancedPacingModal()
    const returned = open({ id: 1 }, { preset_id: null })

    expect(returned).toBe(result)
  })
})
