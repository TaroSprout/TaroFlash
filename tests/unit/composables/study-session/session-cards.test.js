import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createApp, nextTick } from 'vue'
import { useSessionCards } from '@/components/study-session/composables/session-cards'
import { card } from '../../../fixtures/card'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { refetchImpl, restoreRefetchImpl, cardsByIdsQueryMock, readPersistedSessionMock } =
  vi.hoisted(() => ({
    refetchImpl: { current: vi.fn() },
    restoreRefetchImpl: { current: vi.fn() },
    cardsByIdsQueryMock: vi.fn(),
    readPersistedSessionMock: vi.fn(() => undefined)
  }))

const { mockNotice } = vi.hoisted(() => ({
  mockNotice: { error: vi.fn(), success: vi.fn(), warn: vi.fn() }
}))

vi.mock('@/api/cards', () => ({
  useMultiDeckStudyCardsQuery: vi.fn(() => ({
    data: { value: undefined },
    refetch: (...args) => refetchImpl.current(...args),
    refresh: vi.fn()
  })),
  useCardsByIdsQuery: (...args) => {
    cardsByIdsQueryMock(...args)
    return {
      data: { value: undefined },
      refetch: (...args2) => restoreRefetchImpl.current(...args2)
    }
  }
}))

vi.mock('@/components/study-session/composables/session-persistence', () => ({
  readPersistedSession: (...args) => readPersistedSessionMock(...args)
}))

vi.mock('@/stores/notice-store', () => ({
  useNoticeStore: () => mockNotice
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key) => key })
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Mounts useSessionCards inside a minimal app so onMounted fires.
 * Returns the composable result and an unmount function.
 */
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

describe('useSessionCards', () => {
  let unmount

  beforeEach(() => {
    refetchImpl.current = vi.fn()
    restoreRefetchImpl.current = vi.fn()
    cardsByIdsQueryMock.mockClear()
    readPersistedSessionMock.mockReset().mockReturnValue(undefined)
    mockNotice.error.mockReset()
    unmount = null
  })

  afterEach(() => {
    unmount?.()
  })

  // ── Empty deck ids ─────────────────────────────────────────────────────────

  test('calls onMissingDeck and bails when deckIds() is empty [obligation]', async () => {
    const seed = vi.fn()
    const onMissingDeck = vi.fn()

    const setup = withSetup(() =>
      useSessionCards({
        deckIds: () => [],
        studyAllCards: () => false,
        seed,
        onMissingDeck
      })
    )
    unmount = setup.unmount

    await nextTick()

    expect(onMissingDeck).toHaveBeenCalledOnce()
    expect(seed).not.toHaveBeenCalled()
    expect(refetchImpl.current).not.toHaveBeenCalled()
  })

  test('loading stays true when deckIds() is empty [obligation]', async () => {
    const setup = withSetup(() =>
      useSessionCards({
        deckIds: () => [],
        studyAllCards: () => false,
        seed: vi.fn(),
        onMissingDeck: vi.fn()
      })
    )
    unmount = setup.unmount

    await nextTick()

    expect(setup.result.loading.value).toBe(true)
  })

  test('does NOT fire the query (refetch) when deckIds() is empty [obligation]', async () => {
    const setup = withSetup(() =>
      useSessionCards({
        deckIds: () => [],
        studyAllCards: () => false,
        seed: vi.fn(),
        onMissingDeck: vi.fn()
      })
    )
    unmount = setup.unmount

    await nextTick()

    expect(refetchImpl.current).not.toHaveBeenCalled()
  })

  // ── Successful load ────────────────────────────────────────────────────────

  test('seeds cards and sets loading=false when refetch returns success [obligation]', async () => {
    const cards = card.many(3)
    refetchImpl.current = vi.fn().mockResolvedValue({ status: 'success', data: cards, error: null })

    const seed = vi.fn()
    const onMissingDeck = vi.fn()

    const setup = withSetup(() =>
      useSessionCards({
        deckIds: () => [42],
        studyAllCards: () => true,
        seed,
        onMissingDeck
      })
    )
    unmount = setup.unmount

    // Wait for onMounted async work to finish
    await new Promise((r) => setTimeout(r, 0))
    await nextTick()

    expect(onMissingDeck).not.toHaveBeenCalled()
    expect(seed).toHaveBeenCalledWith(cards)
    expect(setup.result.loading.value).toBe(false)
  })

  test('seeds with empty array when data is null (success with no cards) [obligation]', async () => {
    refetchImpl.current = vi.fn().mockResolvedValue({ status: 'success', data: null, error: null })

    const seed = vi.fn()

    const setup = withSetup(() =>
      useSessionCards({
        deckIds: () => [1],
        studyAllCards: () => false,
        seed,
        onMissingDeck: vi.fn()
      })
    )
    unmount = setup.unmount

    await new Promise((r) => setTimeout(r, 0))
    await nextTick()

    expect(seed).toHaveBeenCalledWith([])
    expect(setup.result.loading.value).toBe(false)
  })

  test('works with multiple deck ids — passes deckIds getter to the query', async () => {
    const cards = card.many(5)
    refetchImpl.current = vi.fn().mockResolvedValue({ status: 'success', data: cards, error: null })

    const seed = vi.fn()

    const setup = withSetup(() =>
      useSessionCards({
        deckIds: () => [1, 2, 3],
        studyAllCards: () => false,
        seed,
        onMissingDeck: vi.fn()
      })
    )
    unmount = setup.unmount

    await new Promise((r) => setTimeout(r, 0))
    await nextTick()

    expect(seed).toHaveBeenCalledWith(cards)
    expect(setup.result.loading.value).toBe(false)
  })

  // ── Non-success refetch ────────────────────────────────────────────────────

  test('resets loading to false and does NOT seed when refetch returns non-success [obligation]', async () => {
    refetchImpl.current = vi.fn().mockResolvedValue({ status: 'error', data: null, error: 'oops' })

    const seed = vi.fn()

    const setup = withSetup(() =>
      useSessionCards({
        deckIds: () => [1],
        studyAllCards: () => false,
        seed,
        onMissingDeck: vi.fn()
      })
    )
    unmount = setup.unmount

    await new Promise((r) => setTimeout(r, 0))
    await nextTick()

    expect(seed).not.toHaveBeenCalled()
    expect(setup.result.loading.value).toBe(false)
  })

  test('resets loading to false and does NOT seed when refetch returns pending [obligation]', async () => {
    refetchImpl.current = vi.fn().mockResolvedValue({ status: 'loading', data: null, error: null })

    const seed = vi.fn()

    const setup = withSetup(() =>
      useSessionCards({
        deckIds: () => [1],
        studyAllCards: () => false,
        seed,
        onMissingDeck: vi.fn()
      })
    )
    unmount = setup.unmount

    await new Promise((r) => setTimeout(r, 0))
    await nextTick()

    expect(seed).not.toHaveBeenCalled()
    expect(setup.result.loading.value).toBe(false)
  })

  test('fires a panel notice with a Retry action, closable, when the bootstrap fetch fails [obligation]', async () => {
    refetchImpl.current = vi.fn().mockResolvedValue({ status: 'error', data: null, error: 'oops' })

    const setup = withSetup(() =>
      useSessionCards({
        deckIds: () => [1],
        studyAllCards: () => false,
        seed: vi.fn(),
        onMissingDeck: vi.fn()
      })
    )
    unmount = setup.unmount

    await new Promise((r) => setTimeout(r, 0))
    await nextTick()

    expect(mockNotice.error).toHaveBeenCalledWith(
      'study-session.load-error',
      expect.objectContaining({
        variant: 'panel',
        actions: expect.arrayContaining([expect.objectContaining({ label: 'notice.retry-label' })])
      })
    )
    const [, options] = mockNotice.error.mock.calls[0]
    expect(options).not.toHaveProperty('closable', false)
  })

  test('clicking the Retry action re-invokes the bootstrap fetch [obligation]', async () => {
    refetchImpl.current = vi.fn().mockResolvedValue({ status: 'error', data: null, error: 'oops' })

    const setup = withSetup(() =>
      useSessionCards({
        deckIds: () => [1],
        studyAllCards: () => false,
        seed: vi.fn(),
        onMissingDeck: vi.fn()
      })
    )
    unmount = setup.unmount

    await new Promise((r) => setTimeout(r, 0))
    await nextTick()

    expect(refetchImpl.current).toHaveBeenCalledTimes(1)

    const [, options] = mockNotice.error.mock.calls[0]
    const retry_action = options.actions.find((a) => a.label === 'notice.retry-label')
    retry_action.onClick()
    await new Promise((r) => setTimeout(r, 0))
    await nextTick()

    expect(refetchImpl.current).toHaveBeenCalledTimes(2)
  })

  // ── loading initial value ──────────────────────────────────────────────────

  test('loading starts as true before mount resolves', () => {
    refetchImpl.current = vi.fn().mockReturnValue(new Promise(() => {})) // never resolves

    const setup = withSetup(() =>
      useSessionCards({
        deckIds: () => [1],
        studyAllCards: () => false,
        seed: vi.fn(),
        onMissingDeck: vi.fn()
      })
    )
    unmount = setup.unmount

    // Immediately after mount (but before the async onMounted callback resolves)
    expect(setup.result.loading.value).toBe(true)
  })

  // ── Restore path (refresh-resume) [obligation] ────────────────────────────

  test('fetches only the unreviewed remainder by id — not the full card_ids list [obligation]', async () => {
    const persisted = {
      deck_ids: [1],
      card_ids: [10, 11, 12, 13],
      results: [
        { card_id: 10, passed: true },
        { card_id: 12, passed: false }
      ],
      mode: 'studying'
    }
    readPersistedSessionMock.mockReturnValue(persisted)
    restoreRefetchImpl.current = vi.fn().mockResolvedValue({ status: 'success', data: [] })

    const setup = withSetup(() =>
      useSessionCards({
        deckIds: () => [1],
        studyAllCards: () => false,
        seed: vi.fn(),
        restore: vi.fn(),
        onMissingDeck: vi.fn()
      })
    )
    unmount = setup.unmount

    await new Promise((r) => setTimeout(r, 0))
    await nextTick()

    // useCardsByIdsQuery is called with a ref — assert on the value passed through.
    const passed_ref = cardsByIdsQueryMock.mock.calls[0][0]
    expect(passed_ref.value).toEqual([11, 13])
  })

  test('does NOT call the fresh due-cards query when a persisted session exists [obligation]', async () => {
    readPersistedSessionMock.mockReturnValue({
      deck_ids: [1],
      card_ids: [10],
      results: [],
      mode: 'studying'
    })
    restoreRefetchImpl.current = vi.fn().mockResolvedValue({ status: 'success', data: [] })

    const setup = withSetup(() =>
      useSessionCards({
        deckIds: () => [1],
        studyAllCards: () => false,
        seed: vi.fn(),
        restore: vi.fn(),
        onMissingDeck: vi.fn()
      })
    )
    unmount = setup.unmount

    await new Promise((r) => setTimeout(r, 0))
    await nextTick()

    expect(refetchImpl.current).not.toHaveBeenCalled()
  })

  test('calls restore with the fetched remainder and the persisted snapshot on success [obligation]', async () => {
    const persisted = {
      deck_ids: [1],
      card_ids: [10, 11],
      results: [],
      mode: 'studying'
    }
    readPersistedSessionMock.mockReturnValue(persisted)
    const remainder_cards = card.many(2)
    restoreRefetchImpl.current = vi
      .fn()
      .mockResolvedValue({ status: 'success', data: remainder_cards })

    const restore = vi.fn()
    const setup = withSetup(() =>
      useSessionCards({
        deckIds: () => [1],
        studyAllCards: () => false,
        seed: vi.fn(),
        restore,
        onMissingDeck: vi.fn()
      })
    )
    unmount = setup.unmount

    await new Promise((r) => setTimeout(r, 0))
    await nextTick()

    expect(restore).toHaveBeenCalledWith(remainder_cards, persisted)
    expect(setup.result.loading.value).toBe(false)
  })

  test('calls restore with an empty array when the remainder fetch succeeds with null data', async () => {
    const persisted = {
      deck_ids: [1],
      card_ids: [10],
      results: [],
      mode: 'studying'
    }
    readPersistedSessionMock.mockReturnValue(persisted)
    restoreRefetchImpl.current = vi.fn().mockResolvedValue({ status: 'success', data: null })

    const restore = vi.fn()
    const setup = withSetup(() =>
      useSessionCards({
        deckIds: () => [1],
        studyAllCards: () => false,
        seed: vi.fn(),
        restore,
        onMissingDeck: vi.fn()
      })
    )
    unmount = setup.unmount

    await new Promise((r) => setTimeout(r, 0))
    await nextTick()

    expect(restore).toHaveBeenCalledWith([], persisted)
    expect(setup.result.loading.value).toBe(false)
  })

  test('calls restore with an empty array (skipping the fetch) when every persisted card was already reviewed [obligation]', async () => {
    const persisted = {
      deck_ids: [1],
      card_ids: [10, 11],
      results: [
        { card_id: 10, passed: true },
        { card_id: 11, passed: true }
      ],
      mode: 'completed'
    }
    readPersistedSessionMock.mockReturnValue(persisted)

    const restore = vi.fn()
    const setup = withSetup(() =>
      useSessionCards({
        deckIds: () => [1],
        studyAllCards: () => false,
        seed: vi.fn(),
        restore,
        onMissingDeck: vi.fn()
      })
    )
    unmount = setup.unmount

    await nextTick()

    expect(restore).toHaveBeenCalledWith([], persisted)
    expect(restoreRefetchImpl.current).not.toHaveBeenCalled()
    expect(setup.result.loading.value).toBe(false)
  })

  test('does NOT call restore, but does clear loading, when the remainder fetch does not succeed [obligation]', async () => {
    readPersistedSessionMock.mockReturnValue({
      deck_ids: [1],
      card_ids: [10],
      results: [],
      mode: 'studying'
    })
    restoreRefetchImpl.current = vi.fn().mockResolvedValue({ status: 'error', data: null })

    const restore = vi.fn()
    const setup = withSetup(() =>
      useSessionCards({
        deckIds: () => [1],
        studyAllCards: () => false,
        seed: vi.fn(),
        restore,
        onMissingDeck: vi.fn()
      })
    )
    unmount = setup.unmount

    await new Promise((r) => setTimeout(r, 0))
    await nextTick()

    expect(restore).not.toHaveBeenCalled()
    expect(setup.result.loading.value).toBe(false)
    expect(mockNotice.error).toHaveBeenCalledWith(
      'study-session.load-error',
      expect.objectContaining({ variant: 'panel' })
    )
  })
})
