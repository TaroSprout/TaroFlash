import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { useStudyModal } from '@/views/study-session/composables/study-modal'
import StudySession from '@/views/study-session/index.vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockOpen } = vi.hoisted(() => ({ mockOpen: vi.fn() }))

vi.mock('@/composables/overlay/use-overlay', () => ({
  useOverlay: vi.fn(() => ({ open: mockOpen }))
}))

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useStudyModal', () => {
  beforeEach(() => {
    mockOpen.mockReset()
    mockOpen.mockReturnValue({ result: Promise.resolve(undefined) })
  })

  test('opens a StudySession popup overlay with deck_ids and the notice.info open sfx role', () => {
    const { start } = useStudyModal()
    start([1])

    expect(mockOpen).toHaveBeenCalledWith(StudySession, {
      presentation: 'popup',
      open_sfx: 'notice.info',
      props: { deck_ids: [1] }
    })
  })

  test('passes multiple deck ids through, in the given order', () => {
    const { start } = useStudyModal()
    start([1, 2, 3])

    expect(mockOpen).toHaveBeenCalledWith(
      StudySession,
      expect.objectContaining({ props: { deck_ids: [1, 2, 3] } })
    )
  })

  test('returns the overlay result promise', async () => {
    mockOpen.mockReturnValue({ result: Promise.resolve('some-response') })
    const { start } = useStudyModal()

    await expect(start([1])).resolves.toBe('some-response')
  })

  test('does not open a second overlay by itself — start is a single call, no recursion', async () => {
    const { start } = useStudyModal()
    await start([1])

    expect(mockOpen).toHaveBeenCalledTimes(1)
  })
})
