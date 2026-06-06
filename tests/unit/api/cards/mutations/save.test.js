import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const {
  useMutationSpy,
  saveCardMock,
  debounceMock,
  setInfiniteQueryDataMock,
  getQueryDataMock,
  queryCache
} = vi.hoisted(() => {
  const getQueryDataMock = vi.fn()
  return {
    useMutationSpy: vi.fn((cfg) => cfg),
    saveCardMock: vi.fn().mockResolvedValue(undefined),
    // Call the debounced fn immediately so the mutation resolves synchronously
    // in tests. We still assert on the debounce call shape.
    debounceMock: vi.fn((fn) => fn()),
    setInfiniteQueryDataMock: vi.fn(),
    getQueryDataMock,
    queryCache: { getQueryData: getQueryDataMock }
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

  test('does not install an onSettled handler — deck cache is not invalidated on self-save', () => {
    // Refetch after a self-save would clobber the component-owned editor
    // state that's driving the input. Bulk ops invalidate explicitly.
    const config = configFrom()
    expect(config.onSettled).toBeUndefined()
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
