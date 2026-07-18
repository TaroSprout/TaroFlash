import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { useStudyModal } from '@/views/study-session/composables/study-modal'
import StudySession from '@/views/study-session/index.vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
const { mockOpen } = vi.hoisted(() => ({ mockOpen: vi.fn() }))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitStudySfx: vi.fn(),
  emitHoverSfx: vi.fn()
}))

vi.mock('@/composables/modal', () => ({
  useModal: vi.fn(() => ({ open: mockOpen }))
}))

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useStudyModal', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
    mockOpen.mockReset()
    mockOpen.mockReturnValue({ response: Promise.resolve(undefined) })
  })

  test('plays generic_notification_9 sfx synchronously when starting [obligation]', () => {
    const { start } = useStudyModal()
    start([1])
    expect(mockEmitSfx).toHaveBeenCalledWith('generic_notification_9')
  })

  test('opens a StudySession popup modal with deck_ids [obligation]', () => {
    const { start } = useStudyModal()
    start([1])

    expect(mockOpen).toHaveBeenCalledWith(StudySession, {
      backdrop: true,
      mode: 'popup',
      props: { deck_ids: [1] }
    })
  })

  test('passes multiple deck ids through, in the given order [obligation]', () => {
    const { start } = useStudyModal()
    start([1, 2, 3])

    expect(mockOpen).toHaveBeenCalledWith(
      StudySession,
      expect.objectContaining({ props: { deck_ids: [1, 2, 3] } })
    )
  })

  test('returns the modal response promise', async () => {
    mockOpen.mockReturnValue({ response: Promise.resolve('some-response') })
    const { start } = useStudyModal()

    await expect(start([1])).resolves.toBe('some-response')
  })

  test('does not open a second modal by itself — start is a single call, no recursion [obligation]', async () => {
    const { start } = useStudyModal()
    await start([1])

    expect(mockOpen).toHaveBeenCalledTimes(1)
  })
})
