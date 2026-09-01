import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { useMutationSpy, deleteDeckMock } = vi.hoisted(() => ({
  useMutationSpy: vi.fn((cfg) => cfg),
  deleteDeckMock: vi.fn().mockResolvedValue(undefined)
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

vi.mock('@/api/decks/db', () => ({ deleteDeck: deleteDeckMock }))

import { useDeleteDeckMutation } from '@/api/decks/mutations/delete'

// ── Helpers ───────────────────────────────────────────────────────────────────

function deck(id) {
  return { id }
}

/** Extract the mutation config registered by the last useMutation call */
function config() {
  useDeleteDeckMutation()
  return useMutationSpy.mock.calls.at(-1)[0]
}

beforeEach(() => {
  cached_data = undefined
  useMutationSpy.mockClear()
  deleteDeckMock.mockClear()
  invalidateSpy.mockClear()
  setQueryDataSpy.mockClear()
  getQueryDataSpy.mockClear()
})

// ── mutation() delegates to deleteDeck db function ────────────────────────────

describe('useDeleteDeckMutation — mutation()', () => {
  test('calls deleteDeck with the deck id', async () => {
    const { mutation } = config()
    await mutation(7)
    expect(deleteDeckMock).toHaveBeenCalledWith(7)
  })
})

// ── onMutate — optimistic cache removal ───────────────────────────────────────

describe('useDeleteDeckMutation — onMutate()', () => {
  // the deleted deck is filtered out of the cached list synchronously at mutate time
  test('filters the deleted deck out of the cached list synchronously', () => {
    cached_data = [deck(1), deck(2), deck(3)]
    const { onMutate } = config()

    onMutate(2)

    const written = setQueryDataSpy.mock.calls[0][1]
    expect(written.map((d) => d.id)).toEqual([1, 3])
  })

  // onMutate returns snapshot: undefined when there is no cached list
  test('returns snapshot: undefined and skips the write when decks are not cached', () => {
    cached_data = undefined
    const { onMutate } = config()

    const ctx = onMutate(1)

    expect(setQueryDataSpy).not.toHaveBeenCalled()
    expect(ctx).toEqual({ snapshot: undefined })
  })

  test('returns { snapshot } with the pre-mutate cache state for rollback', () => {
    const initial = [deck(1), deck(2)]
    cached_data = initial
    const { onMutate } = config()

    const ctx = onMutate(1)

    expect(ctx.snapshot).toBe(initial)
  })
})

// ── onError — rollback ────────────────────────────────────────────────────────

describe('useDeleteDeckMutation — onError()', () => {
  // onError restores the snapshot returned by onMutate back into ['decks']
  test('restores the pre-mutate snapshot when deleteDeck rejects', () => {
    const snapshot = [deck(1), deck(2)]
    const { onError } = config()

    onError(new Error('failed'), 1, { snapshot })

    expect(setQueryDataSpy).toHaveBeenCalledWith(['decks'], snapshot)
  })

  // the if (snapshot) guard leaves the cache alone when snapshot is undefined
  test('does not call setQueryData when context.snapshot is undefined', () => {
    const { onError } = config()

    onError(new Error('failed'), 1, { snapshot: undefined })

    expect(setQueryDataSpy).not.toHaveBeenCalled()
  })
})

// ── onSettled — invalidation ───────────────────────────────────────────────────

describe('useDeleteDeckMutation — onSettled()', () => {
  // onSettled invalidates ['decks'] on success, plus ['deck', id] forgotten (not refetched)
  test('invalidates decks and forgets the deck query on settle after success', () => {
    const { onSettled } = config()

    onSettled(undefined, undefined, 5)

    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['decks'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['deck', 5] }, false)
  })

  // onSettled invalidates ['decks'] on error too, but never touches ['deck', id]
  test('invalidates decks but does not invalidate the deck query on settle after an error', () => {
    const { onSettled } = config()

    onSettled(undefined, new Error('failed'), 5)

    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['decks'] })
    expect(invalidateSpy).not.toHaveBeenCalledWith({ key: ['deck', 5] }, false)
  })
})
