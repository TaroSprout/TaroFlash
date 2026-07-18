import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { createApp } from 'vue'
import { useResumeStudySession } from '@/views/study-session/composables/session-resume'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { startMock, readPersistedSessionMock } = vi.hoisted(() => ({
  startMock: vi.fn(),
  readPersistedSessionMock: vi.fn()
}))

vi.mock('@/views/study-session/composables/study-modal', () => ({
  useStudyModal: () => ({ start: startMock })
}))

vi.mock('@/views/study-session/composables/session-persistence', () => ({
  readPersistedSession: (...args) => readPersistedSessionMock(...args)
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function withSetup(composable) {
  let result
  const app = createApp({
    setup() {
      result = composable()
      return () => null
    }
  })
  app.mount(document.createElement('div'))
  return { result, unmount: () => app.unmount() }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useResumeStudySession', () => {
  beforeEach(() => {
    startMock.mockReset()
    readPersistedSessionMock.mockReset()
  })

  test('does nothing when no persisted session exists', () => {
    readPersistedSessionMock.mockReturnValue(undefined)

    const { unmount } = withSetup(() => useResumeStudySession())

    expect(startMock).not.toHaveBeenCalled()
    unmount()
  })

  test('does nothing when the persisted session has an empty deck_ids list [obligation]', () => {
    readPersistedSessionMock.mockReturnValue({
      deck_ids: [],
      card_ids: [10],
      results: [],
      completed: false
    })

    const { unmount } = withSetup(() => useResumeStudySession())

    expect(startMock).not.toHaveBeenCalled()
    unmount()
  })

  test('starts the study modal with the persisted deck_ids directly, no deck refetch [obligation]', () => {
    readPersistedSessionMock.mockReturnValue({
      deck_ids: [1, 2],
      card_ids: [10],
      results: [],
      completed: false
    })

    const { unmount } = withSetup(() => useResumeStudySession())

    expect(startMock).toHaveBeenCalledWith([1, 2])
    unmount()
  })
})
