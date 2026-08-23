import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { useMutationSpy, useQueryCacheMock, invalidateSpy, deleteCardsMock, deleteCardsInDeckMock } =
  vi.hoisted(() => ({
    useMutationSpy: vi.fn((cfg) => cfg),
    useQueryCacheMock: vi.fn(),
    invalidateSpy: vi.fn(),
    deleteCardsMock: vi.fn().mockResolvedValue(undefined),
    deleteCardsInDeckMock: vi.fn().mockResolvedValue(undefined)
  }))

vi.mock('@pinia/colada', () => ({
  useMutation: useMutationSpy,
  useQueryCache: useQueryCacheMock
}))

vi.mock('@/api/cards/db', () => ({
  deleteCards: deleteCardsMock,
  deleteCardsInDeck: deleteCardsInDeckMock
}))

import { useDeleteCardsMutation, useDeleteCardsInDeckMutation } from '@/api/cards/mutations/delete'

/**
 * A minimal in-memory stand-in for Pinia Colada's query cache, keyed by
 * prefix — `getEntries({ key })` matches any stored entry whose own key
 * starts with the given array, mirroring the real cache's prefix matching.
 */
function makeFakeQueryCache(entries = []) {
  const store = new Map(entries.map(({ key, data }) => [JSON.stringify(key), { key, data }]))

  return {
    getEntries: ({ key: prefix }) =>
      [...store.values()]
        .filter((entry) => prefix.every((segment, i) => entry.key[i] === segment))
        .map((entry) => ({ key: entry.key, state: { value: { data: entry.data } } })),
    setQueryData: (key, data) => {
      store.set(JSON.stringify(key), { key, data })
    },
    invalidateQueries: invalidateSpy,
    _read: (key) => store.get(JSON.stringify(key))?.data
  }
}

beforeEach(() => {
  useMutationSpy.mockClear()
  useQueryCacheMock.mockReset()
  useQueryCacheMock.mockReturnValue(makeFakeQueryCache())
  invalidateSpy.mockClear()
  deleteCardsMock.mockClear()
  deleteCardsInDeckMock.mockClear()
})

function configFrom(hook) {
  hook()
  return useMutationSpy.mock.calls.at(-1)[0]
}

describe('useDeleteCardsMutation', () => {
  test('mutation delegates to deleteCards', async () => {
    const { mutation } = configFrom(useDeleteCardsMutation)
    const cards = [{ id: 1, deck_id: 10 }]
    await mutation(cards)
    expect(deleteCardsMock).toHaveBeenCalledWith(cards)
  })

  // The active cards query reads the deleted card; invalidating ['cards', deck_id]
  // is what drops it from the cache so the editor list re-renders without it.
  test("onSettled invalidates each affected deck's cards + deck queries and all card counts", () => {
    const { onSettled } = configFrom(useDeleteCardsMutation)
    onSettled(undefined, undefined, [{ id: 1, deck_id: 10 }])
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['deck', 10] })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['cards', 10] })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['cards', 'count'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['decks'], exact: true })
  })

  test('onSettled invalidates the card index so deleted fronts are removed from highlights [obligation]', () => {
    const { onSettled } = configFrom(useDeleteCardsMutation)
    onSettled(undefined, undefined, [{ id: 1, deck_id: 10 }])
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['cards', 'index'] })
  })

  test('onSettled invalidates each distinct deck once when cards span multiple decks', () => {
    const { onSettled } = configFrom(useDeleteCardsMutation)
    onSettled(undefined, undefined, [
      { id: 1, deck_id: 10 },
      { id: 2, deck_id: 10 },
      { id: 3, deck_id: 20 }
    ])
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['cards', 10] })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['cards', 20] })
    const cards_invalidations = invalidateSpy.mock.calls.filter(
      ([f]) => f.key[0] === 'cards' && f.key[1] === 10
    )
    expect(cards_invalidations).toHaveLength(1)
  })

  // ── onMutate — optimistic removal from every loaded view of the deck ───────

  describe('onMutate', () => {
    test('drops the card from a loaded pages view before the mutation resolves [obligation]', () => {
      const queryCache = makeFakeQueryCache([
        {
          key: ['cards', 10, 'pages', 'default', ''],
          data: {
            pages: [
              {
                cards: [
                  { id: 1, deck_id: 10 },
                  { id: 2, deck_id: 10 }
                ]
              }
            ],
            pageParams: [0]
          }
        }
      ])
      useQueryCacheMock.mockReturnValue(queryCache)

      const { onMutate } = configFrom(useDeleteCardsMutation)
      onMutate([{ id: 1, deck_id: 10 }])

      const stored = queryCache._read(['cards', 10, 'pages', 'default', ''])
      expect(stored.pages[0].cards.map((c) => c.id)).toEqual([2])
    })

    // [obligation] a promoted temp's real_id lands in the persisted list; the
    // optimistic write must match it there too, or the row survives the
    // delete until the invalidated query refetches.
    test('drops a just-promoted card from the persisted pages view [obligation]', () => {
      const queryCache = makeFakeQueryCache([
        {
          key: ['cards', 10, 'pages', 'default', ''],
          data: { pages: [{ cards: [{ id: 500, deck_id: 10 }] }], pageParams: [0] }
        }
      ])
      useQueryCacheMock.mockReturnValue(queryCache)

      const { onMutate } = configFrom(useDeleteCardsMutation)
      onMutate([{ id: 500, deck_id: 10 }])

      const stored = queryCache._read(['cards', 10, 'pages', 'default', ''])
      expect(stored.pages[0].cards).toHaveLength(0)
    })

    // [obligation] a non-default sort and a search view are both loaded under
    // the same ['cards', deck_id, 'pages'] prefix — every one loses the row.
    test('drops the card from every loaded sort/search variant of the same deck [obligation]', () => {
      const queryCache = makeFakeQueryCache([
        {
          key: ['cards', 10, 'pages', 'default', ''],
          data: { pages: [{ cards: [{ id: 1, deck_id: 10 }] }], pageParams: [0] }
        },
        {
          key: ['cards', 10, 'pages', 'newest', ''],
          data: { pages: [{ cards: [{ id: 1, deck_id: 10 }] }], pageParams: [0] }
        },
        {
          key: ['cards', 10, 'pages', 'default', 'front text'],
          data: { pages: [{ cards: [{ id: 1, deck_id: 10 }] }], pageParams: [0] }
        }
      ])
      useQueryCacheMock.mockReturnValue(queryCache)

      const { onMutate } = configFrom(useDeleteCardsMutation)
      onMutate([{ id: 1, deck_id: 10 }])

      expect(queryCache._read(['cards', 10, 'pages', 'default', '']).pages[0].cards).toHaveLength(0)
      expect(queryCache._read(['cards', 10, 'pages', 'newest', '']).pages[0].cards).toHaveLength(0)
      expect(
        queryCache._read(['cards', 10, 'pages', 'default', 'front text']).pages[0].cards
      ).toHaveLength(0)
    })

    test('leaves an unrelated deck untouched', () => {
      const queryCache = makeFakeQueryCache([
        {
          key: ['cards', 20, 'pages', 'default', ''],
          data: { pages: [{ cards: [{ id: 9, deck_id: 20 }] }], pageParams: [0] }
        }
      ])
      useQueryCacheMock.mockReturnValue(queryCache)

      const { onMutate } = configFrom(useDeleteCardsMutation)
      onMutate([{ id: 1, deck_id: 10 }])

      expect(queryCache._read(['cards', 20, 'pages', 'default', '']).pages[0].cards).toHaveLength(1)
    })
  })

  // ── onError — restore the snapshot for every key it touched ────────────────

  describe('onError', () => {
    test('restores the deleted cards to their original position on refusal [obligation]', () => {
      const original_data = {
        pages: [
          {
            cards: [
              { id: 1, deck_id: 10 },
              { id: 2, deck_id: 10 }
            ]
          }
        ],
        pageParams: [0]
      }
      const queryCache = makeFakeQueryCache([
        { key: ['cards', 10, 'pages', 'default', ''], data: original_data }
      ])
      useQueryCacheMock.mockReturnValue(queryCache)

      const { onMutate, onError } = configFrom(useDeleteCardsMutation)
      const context = onMutate([{ id: 1, deck_id: 10 }])
      expect(queryCache._read(['cards', 10, 'pages', 'default', '']).pages[0].cards).toHaveLength(1)

      onError(new Error('refused'), [{ id: 1, deck_id: 10 }], context)

      const restored = queryCache._read(['cards', 10, 'pages', 'default', ''])
      expect(restored.pages[0].cards.map((c) => c.id)).toEqual([1, 2])
    })

    test('restores every touched view, not just one, on refusal [obligation]', () => {
      const default_data = { pages: [{ cards: [{ id: 1, deck_id: 10 }] }], pageParams: [0] }
      const search_data = { pages: [{ cards: [{ id: 1, deck_id: 10 }] }], pageParams: [0] }
      const queryCache = makeFakeQueryCache([
        { key: ['cards', 10, 'pages', 'default', ''], data: default_data },
        { key: ['cards', 10, 'pages', 'default', 'query'], data: search_data }
      ])
      useQueryCacheMock.mockReturnValue(queryCache)

      const { onMutate, onError } = configFrom(useDeleteCardsMutation)
      const context = onMutate([{ id: 1, deck_id: 10 }])

      onError(new Error('refused'), [{ id: 1, deck_id: 10 }], context)

      expect(queryCache._read(['cards', 10, 'pages', 'default', '']).pages[0].cards).toHaveLength(1)
      expect(
        queryCache._read(['cards', 10, 'pages', 'default', 'query']).pages[0].cards
      ).toHaveLength(1)
    })
  })
})

describe('useDeleteCardsInDeckMutation', () => {
  test('mutation delegates to deleteCardsInDeck', async () => {
    const { mutation } = configFrom(useDeleteCardsInDeckMutation)
    const params = { deck_id: 10, except_ids: [7] }
    await mutation(params)
    expect(deleteCardsInDeckMock).toHaveBeenCalledWith(params)
  })

  test("onSettled invalidates the deck's cards + deck queries and all card counts", () => {
    const { onSettled } = configFrom(useDeleteCardsInDeckMutation)
    onSettled(undefined, undefined, { deck_id: 10, except_ids: [7] })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['deck', 10] })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['cards', 10] })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['cards', 'count'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['decks'], exact: true })
  })

  test('onSettled invalidates the card index so bulk-deleted fronts are removed from highlights [obligation]', () => {
    const { onSettled } = configFrom(useDeleteCardsInDeckMutation)
    onSettled(undefined, undefined, { deck_id: 10, except_ids: [] })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['cards', 'index'] })
  })

  // [obligation] select-all delete has no correct optimistic write — it doesn't
  // know which cards it's keeping client-side, so it makes none at all and
  // relies solely on the onSettled invalidation to refetch.
  test('makes no optimistic cache write — no onMutate on the config', () => {
    const config = configFrom(useDeleteCardsInDeckMutation)
    expect(config.onMutate).toBeUndefined()
  })
})
