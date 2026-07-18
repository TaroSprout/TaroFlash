import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createApp, nextTick } from 'vue'
import { useSessionCards } from '@/views/study-session/composables/session-cards'
import { card } from '../../../fixtures/card'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  bootstrapRefetchImpl,
  restoreRefetchImpl,
  cardsByIdsQueryMock,
  sessionBootstrapQueryMock,
  readPersistedSessionMock
} = vi.hoisted(() => ({
  bootstrapRefetchImpl: { current: vi.fn() },
  restoreRefetchImpl: { current: vi.fn() },
  cardsByIdsQueryMock: vi.fn(),
  sessionBootstrapQueryMock: vi.fn(),
  readPersistedSessionMock: vi.fn(() => undefined)
}))

const { mockNotice } = vi.hoisted(() => ({
  mockNotice: { error: vi.fn(), success: vi.fn(), warn: vi.fn() }
}))

vi.mock('@/api/cards', () => ({
  useSessionBootstrapQuery: (...args) => {
    sessionBootstrapQueryMock(...args)
    return {
      data: { value: undefined },
      refetch: (...args2) => bootstrapRefetchImpl.current(...args2)
    }
  },
  useCardsByIdsQuery: (...args) => {
    cardsByIdsQueryMock(...args)
    return {
      data: { value: undefined },
      refetch: (...args2) => restoreRefetchImpl.current(...args2)
    }
  }
}))

vi.mock('@/views/study-session/composables/session-persistence', () => ({
  readPersistedSession: (...args) => readPersistedSessionMock(...args)
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

function bootstrapSuccess(decks, cards) {
  return { status: 'success', data: { decks, cards }, error: null }
}

function makeDeck(overrides = {}) {
  return { id: 1, title: 'Deck', ...overrides }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useSessionCards', () => {
  let unmount

  beforeEach(() => {
    bootstrapRefetchImpl.current = vi.fn()
    restoreRefetchImpl.current = vi.fn()
    cardsByIdsQueryMock.mockClear()
    sessionBootstrapQueryMock.mockClear()
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
      useSessionCards({ deckIds: () => [], seed, restore: vi.fn(), onMissingDeck })
    )
    unmount = setup.unmount

    await nextTick()

    expect(onMissingDeck).toHaveBeenCalledOnce()
    expect(seed).not.toHaveBeenCalled()
    expect(bootstrapRefetchImpl.current).not.toHaveBeenCalled()
  })

  test('loading stays true when deckIds() is empty [obligation]', async () => {
    const setup = withSetup(() =>
      useSessionCards({
        deckIds: () => [],
        seed: vi.fn(),
        restore: vi.fn(),
        onMissingDeck: vi.fn()
      })
    )
    unmount = setup.unmount

    await nextTick()

    expect(setup.result.loading.value).toBe(true)
  })

  // ── Successful bootstrap (no persisted session) — awaits refetch() [obligation] ─

  test('seeds cards from the awaited refetch() result, not a synchronously-cached value [obligation]', async () => {
    const cards = card.many(3)
    const decks = [makeDeck({ id: 42 })]
    bootstrapRefetchImpl.current = vi.fn().mockResolvedValue(bootstrapSuccess(decks, cards))

    const seed = vi.fn()
    const onMissingDeck = vi.fn()

    const setup = withSetup(() =>
      useSessionCards({ deckIds: () => [42], seed, restore: vi.fn(), onMissingDeck })
    )
    unmount = setup.unmount

    await new Promise((r) => setTimeout(r, 0))
    await nextTick()

    expect(bootstrapRefetchImpl.current).toHaveBeenCalledOnce()
    expect(onMissingDeck).not.toHaveBeenCalled()
    expect(seed).toHaveBeenCalledWith(cards)
    expect(setup.result.loading.value).toBe(false)
  })

  test('exposes the resolved sessionDecks from the bootstrap [obligation]', async () => {
    const decks = [makeDeck({ id: 1 }), makeDeck({ id: 2 })]
    bootstrapRefetchImpl.current = vi.fn().mockResolvedValue(bootstrapSuccess(decks, []))

    const setup = withSetup(() =>
      useSessionCards({
        deckIds: () => [1, 2],
        seed: vi.fn(),
        restore: vi.fn(),
        onMissingDeck: vi.fn()
      })
    )
    unmount = setup.unmount

    await new Promise((r) => setTimeout(r, 0))
    await nextTick()

    expect(setup.result.sessionDecks.value).toEqual(decks)
  })

  test('seeds with an empty array when the bootstrap returns no cards', async () => {
    bootstrapRefetchImpl.current = vi.fn().mockResolvedValue(bootstrapSuccess([], undefined))

    const seed = vi.fn()

    const setup = withSetup(() =>
      useSessionCards({ deckIds: () => [1], seed, restore: vi.fn(), onMissingDeck: vi.fn() })
    )
    unmount = setup.unmount

    await new Promise((r) => setTimeout(r, 0))
    await nextTick()

    expect(seed).toHaveBeenCalledWith([])
    expect(setup.result.loading.value).toBe(false)
  })

  test('passes the deckIds getter through to the bootstrap query', () => {
    bootstrapRefetchImpl.current = vi.fn().mockResolvedValue(bootstrapSuccess([], []))
    const setup = withSetup(() =>
      useSessionCards({
        deckIds: () => [1, 2, 3],
        seed: vi.fn(),
        restore: vi.fn(),
        onMissingDeck: vi.fn()
      })
    )

    expect(sessionBootstrapQueryMock).toHaveBeenCalledWith(expect.any(Function))
    expect(sessionBootstrapQueryMock.mock.calls[0][0]()).toEqual([1, 2, 3])

    setup.unmount()
  })

  // ── Non-success bootstrap ──────────────────────────────────────────────────

  test('resets loading to false and does NOT seed when the bootstrap returns non-success [obligation]', async () => {
    bootstrapRefetchImpl.current = vi
      .fn()
      .mockResolvedValue({ status: 'error', data: null, error: 'oops' })

    const seed = vi.fn()

    const setup = withSetup(() =>
      useSessionCards({ deckIds: () => [1], seed, restore: vi.fn(), onMissingDeck: vi.fn() })
    )
    unmount = setup.unmount

    await new Promise((r) => setTimeout(r, 0))
    await nextTick()

    expect(seed).not.toHaveBeenCalled()
    expect(setup.result.loading.value).toBe(false)
  })

  test('fires a panel notice with a Retry action when the bootstrap fetch fails [obligation]', async () => {
    bootstrapRefetchImpl.current = vi
      .fn()
      .mockResolvedValue({ status: 'error', data: null, error: 'oops' })

    const setup = withSetup(() =>
      useSessionCards({
        deckIds: () => [1],
        seed: vi.fn(),
        restore: vi.fn(),
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
  })

  test('clicking the Retry action re-invokes the bootstrap fetch [obligation]', async () => {
    bootstrapRefetchImpl.current = vi
      .fn()
      .mockResolvedValue({ status: 'error', data: null, error: 'oops' })

    const setup = withSetup(() =>
      useSessionCards({
        deckIds: () => [1],
        seed: vi.fn(),
        restore: vi.fn(),
        onMissingDeck: vi.fn()
      })
    )
    unmount = setup.unmount

    await new Promise((r) => setTimeout(r, 0))
    await nextTick()

    expect(bootstrapRefetchImpl.current).toHaveBeenCalledTimes(1)

    const [, options] = mockNotice.error.mock.calls[0]
    const retry_action = options.actions.find((a) => a.label === 'notice.retry-label')
    retry_action.onClick()
    await new Promise((r) => setTimeout(r, 0))
    await nextTick()

    expect(bootstrapRefetchImpl.current).toHaveBeenCalledTimes(2)
  })

  // ── loading initial value ──────────────────────────────────────────────────

  test('loading starts as true before mount resolves', () => {
    bootstrapRefetchImpl.current = vi.fn().mockReturnValue(new Promise(() => {})) // never resolves

    const setup = withSetup(() =>
      useSessionCards({
        deckIds: () => [1],
        seed: vi.fn(),
        restore: vi.fn(),
        onMissingDeck: vi.fn()
      })
    )
    unmount = setup.unmount

    expect(setup.result.loading.value).toBe(true)
  })

  // ── Restore path (refresh-resume) — restore queue lock [obligation] ───────

  test('fetches only the unreviewed remainder by id — not the full card_ids list [obligation]', async () => {
    const persisted = {
      deck_ids: [1],
      card_ids: [10, 11, 12, 13],
      results: [
        { card_id: 10, passed: true },
        { card_id: 12, passed: false }
      ],
      completed: false
    }
    readPersistedSessionMock.mockReturnValue(persisted)
    restoreRefetchImpl.current = vi.fn().mockResolvedValue({ status: 'success', data: [] })
    bootstrapRefetchImpl.current = vi.fn().mockResolvedValue(bootstrapSuccess([makeDeck()], []))

    const setup = withSetup(() =>
      useSessionCards({
        deckIds: () => [1],
        seed: vi.fn(),
        restore: vi.fn(),
        onMissingDeck: vi.fn()
      })
    )
    unmount = setup.unmount

    await new Promise((r) => setTimeout(r, 0))
    await nextTick()

    const passed_ref = cardsByIdsQueryMock.mock.calls[0][0]
    expect(passed_ref.value).toEqual([11, 13])
  })

  test('ignores the bootstrap card list on restore — decks still come from the bootstrap', async () => {
    const persisted = { deck_ids: [1], card_ids: [10], results: [], completed: false }
    readPersistedSessionMock.mockReturnValue(persisted)
    const decks = [makeDeck({ id: 1 })]
    bootstrapRefetchImpl.current = vi
      .fn()
      .mockResolvedValue(bootstrapSuccess(decks, [card.one({ overrides: { id: 999 } })]))
    restoreRefetchImpl.current = vi.fn().mockResolvedValue({ status: 'success', data: [] })

    const restore = vi.fn()
    const setup = withSetup(() =>
      useSessionCards({ deckIds: () => [1], seed: vi.fn(), restore, onMissingDeck: vi.fn() })
    )
    unmount = setup.unmount

    await new Promise((r) => setTimeout(r, 0))
    await nextTick()

    expect(setup.result.sessionDecks.value).toEqual(decks)
    expect(restore).toHaveBeenCalledWith([], persisted)
  })

  test('calls restore with the fetched remainder and the persisted snapshot on success [obligation]', async () => {
    const persisted = { deck_ids: [1], card_ids: [10, 11], results: [], completed: false }
    readPersistedSessionMock.mockReturnValue(persisted)
    bootstrapRefetchImpl.current = vi.fn().mockResolvedValue(bootstrapSuccess([makeDeck()], []))
    const remainder_cards = card.many(2)
    restoreRefetchImpl.current = vi
      .fn()
      .mockResolvedValue({ status: 'success', data: remainder_cards })

    const restore = vi.fn()
    const setup = withSetup(() =>
      useSessionCards({ deckIds: () => [1], seed: vi.fn(), restore, onMissingDeck: vi.fn() })
    )
    unmount = setup.unmount

    await new Promise((r) => setTimeout(r, 0))
    await nextTick()

    expect(restore).toHaveBeenCalledWith(remainder_cards, persisted)
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
      completed: true
    }
    readPersistedSessionMock.mockReturnValue(persisted)
    bootstrapRefetchImpl.current = vi.fn().mockResolvedValue(bootstrapSuccess([makeDeck()], []))

    const restore = vi.fn()
    const setup = withSetup(() =>
      useSessionCards({ deckIds: () => [1], seed: vi.fn(), restore, onMissingDeck: vi.fn() })
    )
    unmount = setup.unmount

    await new Promise((r) => setTimeout(r, 0))
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
      completed: false
    })
    bootstrapRefetchImpl.current = vi.fn().mockResolvedValue(bootstrapSuccess([makeDeck()], []))
    restoreRefetchImpl.current = vi.fn().mockResolvedValue({ status: 'error', data: null })

    const restore = vi.fn()
    const setup = withSetup(() =>
      useSessionCards({ deckIds: () => [1], seed: vi.fn(), restore, onMissingDeck: vi.fn() })
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

  test('a failing bootstrap fetch does not seed and reports the load error even when a persisted session exists [obligation]', async () => {
    readPersistedSessionMock.mockReturnValue({
      deck_ids: [1],
      card_ids: [10],
      results: [],
      completed: false
    })
    bootstrapRefetchImpl.current = vi
      .fn()
      .mockResolvedValue({ status: 'error', data: null, error: 'oops' })

    const restore = vi.fn()
    const setup = withSetup(() =>
      useSessionCards({ deckIds: () => [1], seed: vi.fn(), restore, onMissingDeck: vi.fn() })
    )
    unmount = setup.unmount

    await new Promise((r) => setTimeout(r, 0))
    await nextTick()

    expect(restore).not.toHaveBeenCalled()
    expect(restoreRefetchImpl.current).not.toHaveBeenCalled()
    expect(setup.result.loading.value).toBe(false)
  })
})
