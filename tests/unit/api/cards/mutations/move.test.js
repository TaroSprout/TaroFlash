import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { useMutationSpy, moveCardMock } = vi.hoisted(() => ({
  useMutationSpy: vi.fn((cfg) => cfg),
  moveCardMock: vi.fn().mockResolvedValue(undefined)
}))

// Shared mutable cache state — reset in beforeEach
let cached_data
const invalidateSpy = vi.fn()
const setQueryDataSpy = vi.fn((key, data) => {
  cached_data = data
})
const getQueryDataSpy = vi.fn(() => cached_data)

vi.mock('@pinia/colada', () => ({
  useMutation: useMutationSpy,
  useQueryCache: () => ({
    getQueryData: getQueryDataSpy,
    setQueryData: setQueryDataSpy,
    invalidateQueries: invalidateSpy
  }),
  // Apply the updater to the current cached data and store the result, mirroring
  // what Pinia Colada's real setInfiniteQueryData does for optimistic updates.
  setInfiniteQueryData: (cache, key, updater) => {
    const current = cache.getQueryData(key)
    const next = updater(current)
    cache.setQueryData(key, next)
  }
}))

vi.mock('@/api/cards/db', () => ({ moveCard: moveCardMock }))

import { useMoveCardMutation } from '@/api/cards/mutations/move'

// ── Helpers ───────────────────────────────────────────────────────────────────

function card(id, rank) {
  return { id, rank }
}

/** Build a cache snapshot with the given pages array — each page is a bare cards array. */
function makeSnapshot(pages) {
  return {
    pages: pages.map((cards) => ({ cards, next_rank: null })),
    pageParams: pages.map((_, i) => i * 50)
  }
}

/** Extract the mutation config registered by the last useMutation call */
function config() {
  useMoveCardMutation()
  return useMutationSpy.mock.calls.at(-1)[0]
}

beforeEach(() => {
  cached_data = undefined
  useMutationSpy.mockClear()
  moveCardMock.mockClear()
  invalidateSpy.mockClear()
  setQueryDataSpy.mockClear()
  getQueryDataSpy.mockClear()
})

// ── mutation() delegates to moveCard db function ──────────────────────────────

describe('useMoveCardMutation — mutation()', () => {
  test('calls moveCard with the db params (deck_id stripped)', async () => {
    const { mutation } = config()
    await mutation({ deck_id: 10, card_id: 1, rank: 'a5' })
    expect(moveCardMock).toHaveBeenCalledWith({ card_id: 1, rank: 'a5' })
  })

  test('does not forward deck_id to moveCard (it is a mutation-level concern only)', async () => {
    const { mutation } = config()
    await mutation({ deck_id: 10, card_id: 1, rank: 'a5' })
    const call = moveCardMock.mock.calls[0][0]
    expect('deck_id' in call).toBe(false)
  })
})

// ── onMutate — optimistic cache reorder ───────────────────────────────────────

describe('useMoveCardMutation — onMutate()', () => {
  test('re-keys the moved card and re-sorts by rank', () => {
    cached_data = makeSnapshot([[card(1, 'a0'), card(2, 'a1'), card(3, 'a2')]])
    const { onMutate } = config()

    // Move card 1 to a rank between 2 and 3
    onMutate({ deck_id: 10, card_id: 1, rank: 'a15' })

    const { pages } = setQueryDataSpy.mock.calls[0][1]
    expect(pages[0].cards.map((c) => c.id)).toEqual([2, 1, 3])
  })

  test('ties on identical rank break by ascending id', () => {
    cached_data = makeSnapshot([[card(2, 'a0'), card(3, 'a0')]])
    const { onMutate } = config()

    onMutate({ deck_id: 10, card_id: 3, rank: 'a0' })

    const { pages } = setQueryDataSpy.mock.calls[0][1]
    // Both cards now share rank 'a0' — id ascending breaks the tie
    expect(pages[0].cards.map((c) => c.id)).toEqual([2, 3])
  })

  test('preserves original page sizes when moving a card across page boundaries', () => {
    // Two pages of 2. Move card 4 (page 2) ahead of card 1 (page 1).
    cached_data = makeSnapshot([
      [card(1, 'a0'), card(2, 'a1')],
      [card(3, 'a2'), card(4, 'a3')]
    ])
    const { onMutate } = config()

    onMutate({ deck_id: 10, card_id: 4, rank: 'a05' })

    const { pages } = setQueryDataSpy.mock.calls[0][1]
    expect(pages).toHaveLength(2)
    expect(pages[0].cards).toHaveLength(2)
    expect(pages[1].cards).toHaveLength(2)
    expect(pages[0].cards.map((c) => c.id)).toEqual([1, 4])
    expect(pages[1].cards.map((c) => c.id)).toEqual([2, 3])
  })

  test('preserves next_rank on each refilled page', () => {
    cached_data = {
      pages: [{ cards: [card(1, 'a0'), card(2, 'a1')], next_rank: 'z9' }],
      pageParams: [0]
    }
    const { onMutate } = config()

    onMutate({ deck_id: 10, card_id: 2, rank: 'a05' })

    const { pages } = setQueryDataSpy.mock.calls[0][1]
    expect(pages[0].next_rank).toBe('z9')
  })

  test('is a no-op and returns { snapshot: undefined } when the deck is not cached', () => {
    cached_data = undefined
    const { onMutate } = config()

    const ctx = onMutate({ deck_id: 10, card_id: 1, rank: 'a0' })

    expect(setQueryDataSpy).not.toHaveBeenCalled()
    expect(ctx).toEqual({ snapshot: undefined })
  })

  test('returns { snapshot } with the pre-mutate cache state for rollback', () => {
    const initial = makeSnapshot([[card(1, 'a0'), card(2, 'a1')]])
    cached_data = initial
    const { onMutate } = config()

    const ctx = onMutate({ deck_id: 10, card_id: 2, rank: 'a05' })

    expect(ctx.snapshot).toBe(initial)
  })

  test('leaves the cache unchanged when card_id is not in the cache', () => {
    cached_data = makeSnapshot([[card(1, 'a0'), card(2, 'a1')]])
    const { onMutate } = config()

    onMutate({ deck_id: 10, card_id: 99, rank: 'a05' })

    const { pages } = setQueryDataSpy.mock.calls[0][1]
    expect(pages[0].cards.map((c) => c.id)).toEqual([1, 2])
  })
})

// ── onError — rollback ────────────────────────────────────────────────────────

describe('useMoveCardMutation — onError()', () => {
  test('restores the pre-mutate snapshot when the mutation errors', () => {
    const snapshot = makeSnapshot([[card(1, 'a0'), card(2, 'a1')]])
    const { onError } = config()

    onError(new Error('timeout'), { deck_id: 10 }, { snapshot })

    expect(setQueryDataSpy).toHaveBeenCalledWith(
      ['cards', 10, 'pages', 50, 'default', ''],
      snapshot
    )
  })

  test('does not call setQueryData when context.snapshot is undefined (deck was not cached)', () => {
    const { onError } = config()

    onError(new Error('timeout'), { deck_id: 10 }, { snapshot: undefined })

    expect(setQueryDataSpy).not.toHaveBeenCalled()
  })
})

// ── onSettled — invalidation ──────────────────────────────────────────────────

describe('useMoveCardMutation — onSettled()', () => {
  test('invalidates the deck query on settle', () => {
    const { onSettled } = config()
    onSettled(undefined, undefined, { deck_id: 10 })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['deck', 10] })
  })

  test('invalidates the cards query on settle', () => {
    const { onSettled } = config()
    onSettled(undefined, undefined, { deck_id: 10 })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['cards', 10] })
  })

  test('fires exactly two invalidations (deck + cards prefix)', () => {
    const { onSettled } = config()
    onSettled(undefined, undefined, { deck_id: 10 })
    expect(invalidateSpy).toHaveBeenCalledTimes(2)
  })
})
