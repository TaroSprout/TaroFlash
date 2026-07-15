import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { useMutationSpy, toggleFeedbackVoteMock } = vi.hoisted(() => ({
  useMutationSpy: vi.fn((cfg) => cfg),
  toggleFeedbackVoteMock: vi.fn()
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

vi.mock('@/api/feedback/db', () => ({ toggleFeedbackVote: toggleFeedbackVoteMock }))

import { useToggleFeedbackVoteMutation } from '@/api/feedback/mutations/toggle-vote'

// ── Helpers ───────────────────────────────────────────────────────────────────

function item(id, overrides = {}) {
  return { id, voted_by_me: false, vote_count: 0, ...overrides }
}

/** Extract the mutation config registered by the last useMutation call */
function config() {
  useToggleFeedbackVoteMutation()
  return useMutationSpy.mock.calls.at(-1)[0]
}

beforeEach(() => {
  cached_data = undefined
  useMutationSpy.mockClear()
  toggleFeedbackVoteMock.mockClear()
  invalidateSpy.mockClear()
  setQueryDataSpy.mockClear()
  getQueryDataSpy.mockClear()
})

// ── mutation() delegates to toggleFeedbackVote db function ────────────────────

describe('useToggleFeedbackVoteMutation — mutation()', () => {
  test('calls toggleFeedbackVote with the feedback_id', async () => {
    const { mutation } = config()
    await mutation(5)
    expect(toggleFeedbackVoteMock).toHaveBeenCalledWith(5)
  })
})

// ── onMutate — optimistic cache flip ───────────────────────────────────────────

describe('useToggleFeedbackVoteMutation — onMutate() [obligation]', () => {
  test('flips voted_by_me and increments vote_count when voting for the first time', () => {
    cached_data = [item(5, { voted_by_me: false, vote_count: 3 })]
    const { onMutate } = config()

    onMutate(5)

    const written = setQueryDataSpy.mock.calls[0][1]
    const updated = written.find((i) => i.id === 5)
    expect(updated.voted_by_me).toBe(true)
    expect(updated.vote_count).toBe(4)
  })

  test('flips voted_by_me and decrements vote_count when un-voting', () => {
    cached_data = [item(5, { voted_by_me: true, vote_count: 4 })]
    const { onMutate } = config()

    onMutate(5)

    const written = setQueryDataSpy.mock.calls[0][1]
    const updated = written.find((i) => i.id === 5)
    expect(updated.voted_by_me).toBe(false)
    expect(updated.vote_count).toBe(3)
  })

  test('writes synchronously before the mutation resolves — this is the whole point of onMutate', () => {
    cached_data = [item(5, { voted_by_me: false, vote_count: 0 })]
    const { onMutate } = config()

    onMutate(5)

    expect(setQueryDataSpy).toHaveBeenCalledTimes(1)
    expect(toggleFeedbackVoteMock).not.toHaveBeenCalled()
  })

  test('leaves every other item in the cache untouched', () => {
    cached_data = [
      item(5, { voted_by_me: false, vote_count: 0 }),
      item(6, { voted_by_me: true, vote_count: 9 })
    ]
    const { onMutate } = config()

    onMutate(5)

    const written = setQueryDataSpy.mock.calls[0][1]
    const other = written.find((i) => i.id === 6)
    expect(other).toEqual(item(6, { voted_by_me: true, vote_count: 9 }))
  })

  test('is a no-op and returns undefined snapshot when feedback items are not cached', () => {
    cached_data = undefined
    const { onMutate } = config()

    const ctx = onMutate(5)

    expect(setQueryDataSpy).not.toHaveBeenCalled()
    expect(ctx).toEqual({ snapshot: undefined })
  })

  test('returns { snapshot } with the pre-mutate cache state for rollback', () => {
    const initial = [item(5, { voted_by_me: false, vote_count: 0 })]
    cached_data = initial
    const { onMutate } = config()

    const ctx = onMutate(5)

    expect(ctx.snapshot).toBe(initial)
  })
})

// ── onError — rollback ────────────────────────────────────────────────────────

describe('useToggleFeedbackVoteMutation — onError() [obligation]', () => {
  test('restores the exact pre-toggle snapshot when the mutation errors', () => {
    const snapshot = [item(5, { voted_by_me: false, vote_count: 0 })]
    const { onError } = config()

    onError(new Error('network down'), 5, { snapshot })

    expect(setQueryDataSpy).toHaveBeenCalledWith(['feedback-items'], snapshot)
  })

  test('does not call setQueryData when context.snapshot is undefined (items were not cached)', () => {
    const { onError } = config()

    onError(new Error('network down'), 5, { snapshot: undefined })

    expect(setQueryDataSpy).not.toHaveBeenCalled()
  })
})

// ── onSettled — invalidation ───────────────────────────────────────────────────

describe('useToggleFeedbackVoteMutation — onSettled() [obligation]', () => {
  test('invalidates the feedback-items query on settle after success', () => {
    const { onSettled } = config()
    onSettled(true, undefined, 5)
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['feedback-items'] })
  })

  test('invalidates the feedback-items query on settle after an error', () => {
    const { onSettled } = config()
    onSettled(undefined, new Error('boom'), 5)
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['feedback-items'] })
  })
})
