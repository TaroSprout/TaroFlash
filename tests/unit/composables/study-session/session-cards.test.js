import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createApp, nextTick } from 'vue'
import { useSessionCards } from '@/composables/study-session/session-cards'
import { card } from '../../../fixtures/card'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { refetchImpl } = vi.hoisted(() => ({
  refetchImpl: { current: vi.fn() }
}))

vi.mock('@/api/cards', () => ({
  useStudySessionCardsQuery: vi.fn(() => ({
    data: { value: undefined },
    refetch: (...args) => refetchImpl.current(...args),
    refresh: vi.fn()
  }))
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
    unmount = null
  })

  afterEach(() => {
    unmount?.()
  })

  // ── Missing deck id ────────────────────────────────────────────────────────

  test('calls onMissingDeck and bails when deckId() returns undefined [obligation]', async () => {
    const seed = vi.fn()
    const onMissingDeck = vi.fn()

    const setup = withSetup(() =>
      useSessionCards({
        deckId: () => undefined,
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

  test('loading stays true when deckId() is falsy [obligation]', async () => {
    const setup = withSetup(() =>
      useSessionCards({
        deckId: () => null,
        studyAllCards: () => false,
        seed: vi.fn(),
        onMissingDeck: vi.fn()
      })
    )
    unmount = setup.unmount

    await nextTick()

    expect(setup.result.loading.value).toBe(true)
  })

  // ── Successful load ────────────────────────────────────────────────────────

  test('seeds cards and sets loading=false when refetch returns success [obligation]', async () => {
    const cards = card.many(3)
    refetchImpl.current = vi.fn().mockResolvedValue({ status: 'success', data: cards, error: null })

    const seed = vi.fn()
    const onMissingDeck = vi.fn()

    const setup = withSetup(() =>
      useSessionCards({
        deckId: () => 42,
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
        deckId: () => 1,
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

  // ── Non-success refetch ────────────────────────────────────────────────────

  test('leaves loading true and does NOT seed when refetch returns non-success [obligation]', async () => {
    refetchImpl.current = vi.fn().mockResolvedValue({ status: 'error', data: null, error: 'oops' })

    const seed = vi.fn()

    const setup = withSetup(() =>
      useSessionCards({
        deckId: () => 1,
        studyAllCards: () => false,
        seed,
        onMissingDeck: vi.fn()
      })
    )
    unmount = setup.unmount

    await new Promise((r) => setTimeout(r, 0))
    await nextTick()

    expect(seed).not.toHaveBeenCalled()
    expect(setup.result.loading.value).toBe(true)
  })

  test('leaves loading true and does NOT seed when refetch returns pending [obligation]', async () => {
    refetchImpl.current = vi.fn().mockResolvedValue({ status: 'loading', data: null, error: null })

    const seed = vi.fn()

    const setup = withSetup(() =>
      useSessionCards({
        deckId: () => 1,
        studyAllCards: () => false,
        seed,
        onMissingDeck: vi.fn()
      })
    )
    unmount = setup.unmount

    await new Promise((r) => setTimeout(r, 0))
    await nextTick()

    expect(seed).not.toHaveBeenCalled()
    expect(setup.result.loading.value).toBe(true)
  })

  // ── loading initial value ──────────────────────────────────────────────────

  test('loading starts as true before mount resolves', () => {
    refetchImpl.current = vi.fn().mockReturnValue(new Promise(() => {})) // never resolves

    const setup = withSetup(() =>
      useSessionCards({
        deckId: () => 1,
        studyAllCards: () => false,
        seed: vi.fn(),
        onMissingDeck: vi.fn()
      })
    )
    unmount = setup.unmount

    // Immediately after mount (but before the async onMounted callback resolves)
    expect(setup.result.loading.value).toBe(true)
  })
})
