import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { useMutationSpy, invalidateSpy, deleteCardsMock, deleteCardsInDeckMock } = vi.hoisted(
  () => ({
    useMutationSpy: vi.fn((cfg) => cfg),
    invalidateSpy: vi.fn(),
    deleteCardsMock: vi.fn().mockResolvedValue(undefined),
    deleteCardsInDeckMock: vi.fn().mockResolvedValue(undefined)
  })
)

vi.mock('@pinia/colada', () => ({
  useMutation: useMutationSpy,
  useQueryCache: () => ({ invalidateQueries: invalidateSpy })
}))

vi.mock('@/api/cards/db', () => ({
  deleteCards: deleteCardsMock,
  deleteCardsInDeck: deleteCardsInDeckMock
}))

import { useDeleteCardsMutation, useDeleteCardsInDeckMutation } from '@/api/cards/mutations/delete'

beforeEach(() => {
  useMutationSpy.mockClear()
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
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['decks'] })
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
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['decks'] })
  })

  test('onSettled invalidates the card index so bulk-deleted fronts are removed from highlights [obligation]', () => {
    const { onSettled } = configFrom(useDeleteCardsInDeckMutation)
    onSettled(undefined, undefined, { deck_id: 10, except_ids: [] })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['cards', 'index'] })
  })
})
