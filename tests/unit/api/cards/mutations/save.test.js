import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const {
  useMutationSpy,
  saveCardMock,
  debounceMock,
  setInfiniteQueryDataMock,
  getQueryDataMock,
  invalidateSpy,
  queryCache
} = vi.hoisted(() => {
  const getQueryDataMock = vi.fn()
  const invalidateSpy = vi.fn()
  return {
    useMutationSpy: vi.fn((cfg) => cfg),
    saveCardMock: vi.fn().mockResolvedValue(undefined),
    // Call the debounced fn immediately so the mutation resolves synchronously
    // in tests. We still assert on the debounce call shape.
    debounceMock: vi.fn((fn) => fn()),
    setInfiniteQueryDataMock: vi.fn(),
    getQueryDataMock,
    invalidateSpy,
    queryCache: { getQueryData: getQueryDataMock, invalidateQueries: invalidateSpy }
  }
})

vi.mock('@pinia/colada', () => ({
  useMutation: useMutationSpy,
  useQueryCache: () => queryCache,
  setInfiniteQueryData: setInfiniteQueryDataMock
}))

vi.mock('@/api/cards/db', () => ({
  saveCard: saveCardMock
}))

vi.mock('@/utils/debounce', () => ({
  debounce: debounceMock
}))

vi.mock('@/api/cards/queries/cards-page', () => ({
  cardsInDeckQueryKey: (deck_id) => ['cards', deck_id, 'pages', 50]
}))

import { useSaveCardMutation } from '@/api/cards/mutations/save'

beforeEach(() => {
  useMutationSpy.mockClear()
  saveCardMock.mockClear()
  saveCardMock.mockResolvedValue(undefined)
  debounceMock.mockClear()
  debounceMock.mockImplementation((fn) => fn())
  setInfiniteQueryDataMock.mockClear()
  getQueryDataMock.mockReset()
  getQueryDataMock.mockReturnValue({ pages: [], pageParams: [] })
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

  test('onMutate merges values into the matching cached card, leaving siblings and the other side intact', () => {
    const { onMutate } = configFrom()
    getQueryDataMock.mockReturnValue({
      pages: [
        [
          { id: 5, deck_id: 10, front_text: 'F0', back_text: 'B0' },
          { id: 6, deck_id: 10, front_text: 'X', back_text: 'Y' }
        ]
      ],
      pageParams: [0]
    })

    onMutate({ card: { id: 5, deck_id: 10 }, values: { front_text: 'F1' } })

    const [, key, updater] = setInfiniteQueryDataMock.mock.calls[0]
    expect(key).toEqual(['cards', 10, 'pages', 50])

    const next = updater(getQueryDataMock.mock.results[0].value)
    expect(next.pages[0][0]).toEqual({ id: 5, deck_id: 10, front_text: 'F1', back_text: 'B0' })
    expect(next.pages[0][1]).toEqual({ id: 6, deck_id: 10, front_text: 'X', back_text: 'Y' })
  })

  test('onMutate is a no-op when the deck is not cached', () => {
    const { onMutate } = configFrom()
    getQueryDataMock.mockReturnValue(undefined)

    onMutate({ card: { id: 5, deck_id: 10 }, values: { front_text: 'F1' } })

    expect(setInfiniteQueryDataMock).not.toHaveBeenCalled()
  })

  test('onMutate is a no-op when the card has no deck_id (unpromoted temp)', () => {
    const { onMutate } = configFrom()

    onMutate({ card: { id: -1 }, values: { front_text: 'F1' } })

    expect(setInfiniteQueryDataMock).not.toHaveBeenCalled()
  })
})
