import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const {
  useMutationSpy,
  saveCardMock,
  debounceMock,
  setQueriesDataMock,
  invalidateSpy,
  queryCache
} = vi.hoisted(() => {
  const setQueriesDataMock = vi.fn()
  const invalidateSpy = vi.fn()
  return {
    useMutationSpy: vi.fn((cfg) => cfg),
    saveCardMock: vi.fn().mockResolvedValue(undefined),
    // Call the debounced fn immediately so the mutation resolves synchronously
    // in tests. We still assert on the debounce call shape.
    debounceMock: vi.fn((fn) => fn()),
    setQueriesDataMock,
    invalidateSpy,
    queryCache: { setQueriesData: setQueriesDataMock, invalidateQueries: invalidateSpy }
  }
})

vi.mock('@pinia/colada', () => ({
  useMutation: useMutationSpy,
  useQueryCache: () => queryCache
}))

vi.mock('@/api/cards/db', () => ({
  saveCard: saveCardMock
}))

vi.mock('@/utils/debounce', () => ({
  debounce: debounceMock
}))

import { useSaveCardMutation } from '@/api/cards/mutations/save'

beforeEach(() => {
  useMutationSpy.mockClear()
  saveCardMock.mockClear()
  saveCardMock.mockResolvedValue(undefined)
  debounceMock.mockClear()
  debounceMock.mockImplementation((fn) => fn())
  setQueriesDataMock.mockClear()
  invalidateSpy.mockClear()
})

function configFrom() {
  useSaveCardMutation()
  return useMutationSpy.mock.calls[0][0]
}

describe('useSaveCardMutation', () => {
  test('wraps saveCard in debounce keyed by card id so concurrent edits to different cards do not supersede', async () => {
    const { mutation } = configFrom()

    await mutation({ card: { id: 5, deck_id: 10 }, values: { front_text: 'x' } })

    expect(debounceMock).toHaveBeenCalledWith(expect.any(Function), { key: 'card-5' })
  })

  test('the debounced function, when invoked, calls saveCard with the card and values', async () => {
    const { mutation } = configFrom()

    const card = { id: 5, deck_id: 10 }
    const values = { front_text: 'updated' }
    await mutation({ card, values })

    expect(saveCardMock).toHaveBeenCalledWith(card, values)
  })

  test('onSettled invalidates the card index so the highlight overlay stays in sync [obligation]', () => {
    // Front-text edits change which terms are indexed; the card index query
    // must be marked stale so the highlight overlay updates after a save.
    const { onSettled } = configFrom()
    expect(onSettled).toBeDefined()
    // The invalidation targets ['cards', 'index']
    invalidateSpy.mockClear()
    onSettled()
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['cards', 'index'] })
  })

  // ── Optimistic cache patch ────────────────────────────────────────────────

  test('onMutate calls setQueriesData with the deck prefix key so all sort/filter variants are patched', () => {
    const { onMutate } = configFrom()
    onMutate({ card: { id: 5, deck_id: 10 }, values: { front_text: 'F1' } })
    const [filter] = setQueriesDataMock.mock.calls[0]
    expect(filter).toEqual({ key: ['cards', 10, 'pages'] })
  })

  test('onMutate updater merges values into the matching card, leaving siblings intact', () => {
    const { onMutate } = configFrom()
    onMutate({ card: { id: 5, deck_id: 10 }, values: { front_text: 'F1' } })

    const [, updater] = setQueriesDataMock.mock.calls[0]
    const old = {
      pages: [
        [
          { id: 5, deck_id: 10, front_text: 'F0', back_text: 'B0' },
          { id: 6, deck_id: 10, front_text: 'X', back_text: 'Y' }
        ]
      ],
      pageParams: [0]
    }
    const next = updater(old)
    expect(next.pages[0][0]).toEqual({ id: 5, deck_id: 10, front_text: 'F1', back_text: 'B0' })
    expect(next.pages[0][1]).toEqual({ id: 6, deck_id: 10, front_text: 'X', back_text: 'Y' })
  })

  test('onMutate updater handles undefined old value gracefully (empty pages)', () => {
    const { onMutate } = configFrom()
    onMutate({ card: { id: 5, deck_id: 10 }, values: { front_text: 'F1' } })
    const [, updater] = setQueriesDataMock.mock.calls[0]
    const result = updater(undefined)
    expect(result.pages).toEqual([])
    expect(result.pageParams).toEqual([])
  })

  test('onMutate is a no-op when the card has no deck_id (unpromoted temp)', () => {
    const { onMutate } = configFrom()

    onMutate({ card: { id: -1 }, values: { front_text: 'F1' } })

    expect(setQueriesDataMock).not.toHaveBeenCalled()
  })

  test('onMutate is a no-op when the card has no id', () => {
    const { onMutate } = configFrom()

    onMutate({ card: { deck_id: 10 }, values: { front_text: 'F1' } })

    expect(setQueriesDataMock).not.toHaveBeenCalled()
  })
})
