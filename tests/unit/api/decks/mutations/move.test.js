import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { useMutationSpy, moveDeckMock } = vi.hoisted(() => ({
  useMutationSpy: vi.fn((cfg) => cfg),
  moveDeckMock: vi.fn().mockResolvedValue(1234)
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
  })
}))

vi.mock('@/api/decks/db', () => ({ moveDeck: moveDeckMock }))

import { useMoveDeckMutation } from '@/api/decks/mutations/move'

// ── Helpers ───────────────────────────────────────────────────────────────────

function deck(id, rank) {
  return { id, rank }
}

/** Extract the mutation config registered by the last useMutation call */
function config() {
  useMoveDeckMutation()
  return useMutationSpy.mock.calls.at(-1)[0]
}

beforeEach(() => {
  cached_data = undefined
  useMutationSpy.mockClear()
  moveDeckMock.mockClear()
  invalidateSpy.mockClear()
  setQueryDataSpy.mockClear()
  getQueryDataSpy.mockClear()
})

// ── mutation() delegates to moveDeck db function ──────────────────────────────

describe('useMoveDeckMutation — mutation()', () => {
  test('calls moveDeck with the mutation params', async () => {
    const { mutation } = config()
    await mutation({ deck_id: 1, anchor_id: 2, side: 'after' })
    expect(moveDeckMock).toHaveBeenCalledWith({ deck_id: 1, anchor_id: 2, side: 'after' })
  })
})

// ── onMutate — optimistic cache reorder ───────────────────────────────────────

describe('useMoveDeckMutation — onMutate()', () => {
  // [obligation] rank is computed off a rank-sorted view, not raw array-index adjacency
  test('resolves the anchor from rank-sorted neighbours, not raw array-adjacent ones [obligation]', () => {
    // Cache array order deliberately does NOT match rank order: rank 30 sits
    // at array index 0, rank 10 at index 1, rank 20 at index 2. Moving deck 40
    // to sit after anchor (rank 10, id 2) must land between rank 10 and rank
    // 20 — the rank-sorted neighbours — not adjacent to its raw array
    // position (which would be next to rank 30).
    cached_data = [deck(1, 30), deck(2, 10), deck(3, 20), deck(4, 40)]
    const { onMutate } = config()

    onMutate({ deck_id: 4, anchor_id: 2, side: 'after' })

    const written = setQueryDataSpy.mock.calls[0][1]
    const moved = written.find((d) => d.id === 4)
    expect(moved.rank).toBeGreaterThan(10)
    expect(moved.rank).toBeLessThan(20)
  })

  test('resolves before-anchor from rank-sorted neighbours in a shuffled cache', () => {
    // Rank order is 2(10) < 3(20) < 1(30). Moving deck 4 to before anchor 3
    // (rank 20) must land strictly between rank 10 and rank 20.
    cached_data = [deck(1, 30), deck(2, 10), deck(3, 20), deck(4, 999)]
    const { onMutate } = config()

    onMutate({ deck_id: 4, anchor_id: 3, side: 'before' })

    const written = setQueryDataSpy.mock.calls[0][1]
    const moved = written.find((d) => d.id === 4)
    expect(moved.rank).toBeGreaterThan(10)
    expect(moved.rank).toBeLessThan(20)
  })

  // [obligation] patches only the moved deck's rank; raw array order/positions untouched
  test('leaves the cache array order (by id) unchanged — only the moved rank field differs [obligation]', () => {
    cached_data = [deck(1, 30), deck(2, 10), deck(3, 20), deck(4, 40)]
    const original_order = cached_data.map((d) => d.id)
    const { onMutate } = config()

    onMutate({ deck_id: 4, anchor_id: 2, side: 'after' })

    const written = setQueryDataSpy.mock.calls[0][1]
    expect(written.map((d) => d.id)).toEqual(original_order)
    // Every other deck's rank is untouched
    expect(written.find((d) => d.id === 1).rank).toBe(30)
    expect(written.find((d) => d.id === 2).rank).toBe(10)
    expect(written.find((d) => d.id === 3).rank).toBe(20)
  })

  test('interpolates an open-ended rank when the anchor is the last rank-sorted deck', () => {
    cached_data = [deck(1, 10), deck(2, 20)]
    const { onMutate } = config()

    onMutate({ deck_id: 1, anchor_id: 2, side: 'after' })

    const written = setQueryDataSpy.mock.calls[0][1]
    expect(written.find((d) => d.id === 1).rank).toBeGreaterThan(20)
  })

  test('interpolates an open-ended rank when the anchor is the first rank-sorted deck', () => {
    cached_data = [deck(1, 10), deck(2, 20)]
    const { onMutate } = config()

    onMutate({ deck_id: 2, anchor_id: 1, side: 'before' })

    const written = setQueryDataSpy.mock.calls[0][1]
    expect(written.find((d) => d.id === 2).rank).toBeLessThan(10)
  })

  // [obligation] no-op when the deck list isn't cached
  test('is a no-op and returns undefined snapshot when decks are not cached [obligation]', () => {
    cached_data = undefined
    const { onMutate } = config()

    const ctx = onMutate({ deck_id: 1, anchor_id: 2, side: 'after' })

    expect(setQueryDataSpy).not.toHaveBeenCalled()
    expect(ctx).toEqual({ snapshot: undefined })
  })

  test('returns the pre-mutate snapshot unchanged when the anchor is not found', () => {
    const initial = [deck(1, 10), deck(2, 20)]
    cached_data = initial
    const { onMutate } = config()

    const ctx = onMutate({ deck_id: 1, anchor_id: 999, side: 'after' })

    expect(setQueryDataSpy).not.toHaveBeenCalled()
    expect(ctx.snapshot).toBe(initial)
  })

  test('returns { snapshot } with the pre-mutate cache state for rollback', () => {
    const initial = [deck(1, 10), deck(2, 20)]
    cached_data = initial
    const { onMutate } = config()

    const ctx = onMutate({ deck_id: 1, anchor_id: 2, side: 'after' })

    expect(ctx.snapshot).toBe(initial)
  })
})

// ── onError — rollback ────────────────────────────────────────────────────────

describe('useMoveDeckMutation — onError()', () => {
  // [obligation] onError restores the exact pre-mutation snapshot
  test('restores the pre-mutate snapshot when the mutation errors [obligation]', () => {
    const snapshot = [deck(1, 10), deck(2, 20)]
    const { onError } = config()

    onError(new Error('timeout'), { deck_id: 1, anchor_id: 2, side: 'after' }, { snapshot })

    expect(setQueryDataSpy).toHaveBeenCalledWith(['decks'], snapshot)
  })

  test('does not call setQueryData when context.snapshot is undefined (decks were not cached)', () => {
    const { onError } = config()

    onError(new Error('timeout'), { deck_id: 1 }, { snapshot: undefined })

    expect(setQueryDataSpy).not.toHaveBeenCalled()
  })
})

// ── onSettled — invalidation ───────────────────────────────────────────────────

describe('useMoveDeckMutation — onSettled()', () => {
  // [obligation] onSettled invalidates ['decks'] regardless of success or failure
  test('invalidates the decks query on settle after success', () => {
    const { onSettled } = config()
    onSettled(1234, undefined, { deck_id: 1, anchor_id: 2, side: 'after' })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['decks'] })
  })

  test('invalidates the decks query on settle after an error [obligation]', () => {
    const { onSettled } = config()
    onSettled(undefined, new Error('boom'), { deck_id: 1, anchor_id: 2, side: 'after' })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['decks'] })
  })
})
