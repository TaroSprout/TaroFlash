import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { useMutationSpy, moveCardMock } = vi.hoisted(() => ({
  useMutationSpy: vi.fn((cfg) => cfg),
  moveCardMock: vi.fn().mockResolvedValue(9001)
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

function card(id) {
  return { id, rank: id * 1000 }
}

/** Build a cache snapshot with the given pages array */
function makeSnapshot(pages) {
  return { pages, pageParams: pages.map((_, i) => i * 50) }
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
    await mutation({ deck_id: 10, card_id: 1, anchor_id: 2, side: 'after' })
    expect(moveCardMock).toHaveBeenCalledWith({ card_id: 1, anchor_id: 2, side: 'after' })
  })

  test('does not forward deck_id to moveCard (it is a mutation-level concern only)', async () => {
    const { mutation } = config()
    await mutation({ deck_id: 10, card_id: 1, anchor_id: 2, side: 'before' })
    const call = moveCardMock.mock.calls[0][0]
    expect('deck_id' in call).toBe(false)
  })
})

// ── onMutate — optimistic cache reorder ───────────────────────────────────────

describe('useMoveCardMutation — onMutate()', () => {
  // [obligation] optimistically reorders cached pages synchronously before RPC resolves
  test('reorders the card to after the anchor synchronously on mutate [obligation]', () => {
    cached_data = makeSnapshot([[card(1), card(2), card(3)]])
    const { onMutate } = config()

    onMutate({ deck_id: 10, card_id: 3, anchor_id: 1, side: 'after' })

    expect(setQueryDataSpy).toHaveBeenCalledOnce()
    const { pages } = setQueryDataSpy.mock.calls[0][1]
    expect(pages[0].map((c) => c.id)).toEqual([1, 3, 2])
  })

  test('reorders the card to before the anchor on side=before', () => {
    cached_data = makeSnapshot([[card(1), card(2), card(3)]])
    const { onMutate } = config()

    onMutate({ deck_id: 10, card_id: 3, anchor_id: 2, side: 'before' })

    const { pages } = setQueryDataSpy.mock.calls[0][1]
    expect(pages[0].map((c) => c.id)).toEqual([1, 3, 2])
  })

  // [obligation] anchor index computed AFTER removing moved card (regression guard)
  test('places card correctly when moving first card to after a later card [obligation]', () => {
    // A=1, B=2, C=3. Move A (idx 0) to after B.
    // If anchor_index was computed BEFORE removing A: B is at idx 1 (stale) → splice(2,0,A) → [B,C,A] (wrong)
    // Correct: remove A → [B,C], B is now at idx 0 → splice(1,0,A) → [B,A,C] ✓
    cached_data = makeSnapshot([[card(1), card(2), card(3)]])
    const { onMutate } = config()

    onMutate({ deck_id: 10, card_id: 1, anchor_id: 2, side: 'after' })

    const { pages } = setQueryDataSpy.mock.calls[0][1]
    expect(pages[0].map((c) => c.id)).toEqual([2, 1, 3])
  })

  // [obligation] re-chunks into original page sizes on cross-page move
  test('preserves original page sizes when moving a card across page boundaries [obligation]', () => {
    // Two pages of 2. Move card 4 (page 2) to after card 1 (page 1).
    cached_data = makeSnapshot([
      [card(1), card(2)],
      [card(3), card(4)]
    ])
    const { onMutate } = config()

    onMutate({ deck_id: 10, card_id: 4, anchor_id: 1, side: 'after' })

    const { pages } = setQueryDataSpy.mock.calls[0][1]
    expect(pages).toHaveLength(2)
    expect(pages[0]).toHaveLength(2)
    expect(pages[1]).toHaveLength(2)
    expect(pages[0].map((c) => c.id)).toEqual([1, 4])
    expect(pages[1].map((c) => c.id)).toEqual([2, 3])
  })

  // [obligation] no-op when deck not cached — returns { snapshot: undefined }
  test('is a no-op and returns { snapshot: undefined } when the deck is not cached [obligation]', () => {
    cached_data = undefined
    const { onMutate } = config()

    const ctx = onMutate({ deck_id: 10, card_id: 1, anchor_id: 2, side: 'after' })

    expect(setQueryDataSpy).not.toHaveBeenCalled()
    expect(ctx).toEqual({ snapshot: undefined })
  })

  test('returns { snapshot } with the pre-mutate cache state for rollback', () => {
    const initial = makeSnapshot([[card(1), card(2)]])
    cached_data = initial
    const { onMutate } = config()

    const ctx = onMutate({ deck_id: 10, card_id: 2, anchor_id: 1, side: 'before' })

    expect(ctx.snapshot).toBe(initial)
  })

  test('is a no-op (no crash) when card_id is not in the cache', () => {
    cached_data = makeSnapshot([[card(1), card(2)]])
    const { onMutate } = config()

    // card 99 doesn't exist — should return snapshot without patching
    onMutate({ deck_id: 10, card_id: 99, anchor_id: 1, side: 'after' })

    // setQueryData IS called by setInfiniteQueryData but updater bails early
    // so page order is unchanged
    const { pages } = setQueryDataSpy.mock.calls[0][1]
    expect(pages[0].map((c) => c.id)).toEqual([1, 2])
  })
})

// ── onError — rollback ────────────────────────────────────────────────────────

describe('useMoveCardMutation — onError()', () => {
  // [obligation] onError restores the snapshot on failure
  test('restores the pre-mutate snapshot when the mutation errors [obligation]', () => {
    const snapshot = makeSnapshot([[card(1), card(2)]])
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
  // [obligation] invalidates ['deck', deck_id] and ['cards', deck_id] on settle
  test('invalidates the deck query on settle [obligation]', () => {
    const { onSettled } = config()
    onSettled(undefined, undefined, { deck_id: 10 })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['deck', 10] })
  })

  test('invalidates the cards query on settle [obligation]', () => {
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
