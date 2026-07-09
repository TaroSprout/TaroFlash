import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { createApp, nextTick } from 'vue'
import { useResumeStudySession } from '@/components/flashcard-session/composables/session-resume'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { refetchImpl, startMock, readPersistedSessionMock, clearPersistedSessionMock } = vi.hoisted(
  () => ({
    refetchImpl: { current: vi.fn() },
    startMock: vi.fn(),
    readPersistedSessionMock: vi.fn(),
    clearPersistedSessionMock: vi.fn()
  })
)

const { mockNotice } = vi.hoisted(() => ({
  mockNotice: { error: vi.fn(), success: vi.fn(), warn: vi.fn() }
}))

vi.mock('@/api/decks', () => ({
  useDecksByIdsQuery: vi.fn(() => ({
    refetch: (...args) => refetchImpl.current(...args)
  }))
}))

vi.mock('@/components/flashcard-session/composables/study-modal', () => ({
  useStudyModal: () => ({ start: startMock })
}))

vi.mock('@/components/flashcard-session/composables/session-persistence', () => ({
  readPersistedSession: (...args) => readPersistedSessionMock(...args),
  clearPersistedSession: (...args) => clearPersistedSessionMock(...args)
}))

vi.mock('@/stores/notice-store', () => ({
  useNoticeStore: () => mockNotice
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key) => key })
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
  const el = document.createElement('div')
  app.mount(el)
  return { result, unmount: () => app.unmount() }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useResumeStudySession', () => {
  let unmount

  beforeEach(() => {
    refetchImpl.current = vi.fn()
    startMock.mockReset()
    readPersistedSessionMock.mockReset()
    clearPersistedSessionMock.mockReset()
    mockNotice.error.mockReset()
    unmount = null
  })

  test('does nothing when no persisted session exists', async () => {
    readPersistedSessionMock.mockReturnValue(undefined)

    const setup = withSetup(() => useResumeStudySession())
    unmount = setup.unmount
    await nextTick()

    expect(refetchImpl.current).not.toHaveBeenCalled()
    expect(startMock).not.toHaveBeenCalled()
    expect(clearPersistedSessionMock).not.toHaveBeenCalled()
  })

  test('clears the persisted session and does NOT start the modal when the deck fetch returns empty [obligation]', async () => {
    readPersistedSessionMock.mockReturnValue({
      deck_ids: [1, 2],
      card_ids: [10],
      results: [],
      mode: 'studying'
    })
    refetchImpl.current = vi.fn().mockResolvedValue({ data: [] })

    const setup = withSetup(() => useResumeStudySession())
    unmount = setup.unmount

    await new Promise((r) => setTimeout(r, 0))
    await nextTick()

    expect(clearPersistedSessionMock).toHaveBeenCalledOnce()
    expect(startMock).not.toHaveBeenCalled()
  })

  test('clears the persisted session when the deck fetch returns null data [obligation]', async () => {
    readPersistedSessionMock.mockReturnValue({
      deck_ids: [1],
      card_ids: [10],
      results: [],
      mode: 'studying'
    })
    refetchImpl.current = vi.fn().mockResolvedValue({ data: null })

    const setup = withSetup(() => useResumeStudySession())
    unmount = setup.unmount

    await new Promise((r) => setTimeout(r, 0))
    await nextTick()

    expect(clearPersistedSessionMock).toHaveBeenCalledOnce()
    expect(startMock).not.toHaveBeenCalled()
  })

  test('starts the study modal with the fetched decks and the persisted config_override when decks are found [obligation]', async () => {
    const decks = [{ id: 1, title: 'Deck A' }]
    const config_override = { study_all_cards: true }
    readPersistedSessionMock.mockReturnValue({
      deck_ids: [1],
      card_ids: [10],
      results: [],
      mode: 'studying',
      config_override
    })
    refetchImpl.current = vi.fn().mockResolvedValue({ data: decks })

    const setup = withSetup(() => useResumeStudySession())
    unmount = setup.unmount

    await new Promise((r) => setTimeout(r, 0))
    await nextTick()

    expect(startMock).toHaveBeenCalledWith(decks, config_override)
    expect(clearPersistedSessionMock).not.toHaveBeenCalled()
  })

  test('shows a notice and does NOT start the modal when the decks refetch throws [obligation]', async () => {
    readPersistedSessionMock.mockReturnValue({
      deck_ids: [1],
      card_ids: [10],
      results: [],
      mode: 'studying'
    })
    refetchImpl.current = vi.fn().mockRejectedValue(new Error('network error'))

    const setup = withSetup(() => useResumeStudySession())
    unmount = setup.unmount

    await new Promise((r) => setTimeout(r, 0))
    await nextTick()

    expect(mockNotice.error).toHaveBeenCalledWith('study-session.resume-error')
    expect(startMock).not.toHaveBeenCalled()
  })

  test('does NOT clear the persisted session when the decks refetch throws (only the empty-decks path clears it) [obligation]', async () => {
    readPersistedSessionMock.mockReturnValue({
      deck_ids: [1],
      card_ids: [10],
      results: [],
      mode: 'studying'
    })
    refetchImpl.current = vi.fn().mockRejectedValue(new Error('network error'))

    const setup = withSetup(() => useResumeStudySession())
    unmount = setup.unmount

    await new Promise((r) => setTimeout(r, 0))
    await nextTick()

    expect(clearPersistedSessionMock).not.toHaveBeenCalled()
  })
})
