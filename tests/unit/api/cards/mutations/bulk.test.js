import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const {
  useMutationSpy,
  invalidateSpy,
  upsertCardsMock,
  deleteCardsMock,
  deleteCardsInDeckMock,
  bulkInsertCardsInDeckMock,
  moveCardMock,
  moveCardsToDeckMock
} = vi.hoisted(() => ({
  useMutationSpy: vi.fn((cfg) => cfg),
  invalidateSpy: vi.fn(),
  upsertCardsMock: vi.fn().mockResolvedValue([]),
  deleteCardsMock: vi.fn().mockResolvedValue(undefined),
  deleteCardsInDeckMock: vi.fn().mockResolvedValue(0),
  bulkInsertCardsInDeckMock: vi.fn().mockResolvedValue([]),
  moveCardMock: vi.fn().mockResolvedValue(1500),
  moveCardsToDeckMock: vi.fn().mockResolvedValue(undefined)
}))

vi.mock('@pinia/colada', () => ({
  useMutation: useMutationSpy,
  useQueryCache: () => ({ invalidateQueries: invalidateSpy })
}))

vi.mock('@/api/cards/db', () => ({
  upsertCards: upsertCardsMock,
  deleteCards: deleteCardsMock,
  deleteCardsInDeck: deleteCardsInDeckMock,
  bulkInsertCardsInDeck: bulkInsertCardsInDeckMock,
  moveCard: moveCardMock,
  moveCardsToDeck: moveCardsToDeckMock
}))

import { useUpsertCardsMutation } from '@/api/cards/mutations/upsert-bulk'
import { useDeleteCardsMutation, useDeleteCardsInDeckMutation } from '@/api/cards/mutations/delete'
import { useBulkInsertCardsInDeckMutation } from '@/api/cards/mutations/bulk-insert'
import { useMoveCardMutation } from '@/api/cards/mutations/move'
import { useMoveCardsToDeckMutation } from '@/api/cards/mutations/move-to-deck'

beforeEach(() => {
  useMutationSpy.mockClear()
  invalidateSpy.mockClear()
  upsertCardsMock.mockClear()
  deleteCardsMock.mockClear()
  deleteCardsInDeckMock.mockClear()
  bulkInsertCardsInDeckMock.mockClear()
  moveCardMock.mockClear()
  moveCardsToDeckMock.mockClear()
})

function configFrom(hook) {
  hook()
  return useMutationSpy.mock.calls.at(-1)[0]
}

function invalidatedKeys() {
  return invalidateSpy.mock.calls.map((c) => c[0].key)
}

describe('useUpsertCardsMutation', () => {
  test('mutation delegates to upsertCards', async () => {
    const { mutation } = configFrom(useUpsertCardsMutation)
    const cards = [{ id: 1, deck_id: 10, front_text: 'Q' }]
    await mutation(cards)
    expect(upsertCardsMock).toHaveBeenCalledWith(cards)
  })

  test('aggregates unique deck_ids from the batch and invalidates each', () => {
    const { onSettled } = configFrom(useUpsertCardsMutation)

    onSettled([], undefined, [
      { id: 1, deck_id: 10 },
      { id: 2, deck_id: 10 },
      { id: 3, deck_id: 20 }
    ])

    const keys = invalidatedKeys()
    expect(keys).toContainEqual(['deck', 10])
    expect(keys).toContainEqual(['deck', 20])
    expect(keys).toContainEqual(['cards', 10])
    expect(keys).toContainEqual(['cards', 20])
  })

  test('skips cards without a deck_id when aggregating', () => {
    const { onSettled } = configFrom(useUpsertCardsMutation)

    onSettled([], undefined, [{ id: 1 }, { id: 2, deck_id: 10 }])

    const keys = invalidatedKeys()
    // no `['deck', undefined]` key was invalidated
    expect(keys.every((k) => !(k[0] === 'deck' && k[1] === undefined))).toBe(true)
    expect(keys).toContainEqual(['deck', 10])
  })

  test('also invalidates all card counts + decks list (bulk writes shift totals)', () => {
    const { onSettled } = configFrom(useUpsertCardsMutation)

    onSettled([], undefined, [{ id: 1, deck_id: 10 }])

    const keys = invalidatedKeys()
    expect(keys).toContainEqual(['cards', 'count'])
    expect(keys).toContainEqual(['decks'])
  })

  test('onSettled invalidates card index — upserted fronts must appear in highlights [obligation]', () => {
    const { onSettled } = configFrom(useUpsertCardsMutation)
    onSettled([], undefined, [{ id: 1, deck_id: 10 }])
    expect(invalidatedKeys()).toContainEqual(['cards', 'index'])
  })
})

describe('useDeleteCardsMutation', () => {
  test('aggregates unique deck_ids and invalidates each plus counts', () => {
    const { onSettled } = configFrom(useDeleteCardsMutation)

    onSettled(undefined, undefined, [
      { id: 1, deck_id: 10 },
      { id: 2, deck_id: 20 }
    ])

    const keys = invalidatedKeys()
    expect(keys).toContainEqual(['deck', 10])
    expect(keys).toContainEqual(['deck', 20])
    expect(keys).toContainEqual(['cards', 'count'])
    expect(keys).toContainEqual(['decks'])
  })

  test('mutation delegates to deleteCards', async () => {
    const { mutation } = configFrom(useDeleteCardsMutation)
    const cards = [{ id: 1, deck_id: 10 }]
    await mutation(cards)
    expect(deleteCardsMock).toHaveBeenCalledWith(cards)
  })
})

describe('useBulkInsertCardsInDeckMutation', () => {
  test('mutation delegates to bulkInsertCardsInDeck', async () => {
    const { mutation } = configFrom(useBulkInsertCardsInDeckMutation)
    const params = {
      deck_id: 10,
      cards: [{ front_text: 'A', back_text: '1' }]
    }
    await mutation(params)
    expect(bulkInsertCardsInDeckMock).toHaveBeenCalledWith(params)
  })

  test('onSettled invalidates the deck + all card counts (bulk insert shifts deck totals)', () => {
    const { onSettled } = configFrom(useBulkInsertCardsInDeckMutation)
    onSettled([], undefined, { deck_id: 10, cards: [] })
    const keys = invalidatedKeys()
    expect(keys).toContainEqual(['deck', 10])
    expect(keys).toContainEqual(['cards', 10])
    expect(keys).toContainEqual(['cards', 'count'])
    expect(keys).toContainEqual(['decks'])
  })

  test('onSettled invalidates card index — inserted fronts must appear in highlights [obligation]', () => {
    const { onSettled } = configFrom(useBulkInsertCardsInDeckMutation)
    onSettled([], undefined, { deck_id: 10, cards: [] })
    expect(invalidatedKeys()).toContainEqual(['cards', 'index'])
  })
})

describe('useDeleteCardsInDeckMutation', () => {
  test('mutation delegates to deleteCardsInDeck (strips the deck_id-shaped wrapper through)', async () => {
    const { mutation } = configFrom(useDeleteCardsInDeckMutation)
    await mutation({ deck_id: 10, except_ids: [1, 2] })
    expect(deleteCardsInDeckMock).toHaveBeenCalledWith({ deck_id: 10, except_ids: [1, 2] })
  })

  test('onSettled invalidates the deck + all card counts', () => {
    const { onSettled } = configFrom(useDeleteCardsInDeckMutation)
    onSettled(0, undefined, { deck_id: 10 })
    const keys = invalidatedKeys()
    expect(keys).toContainEqual(['deck', 10])
    expect(keys).toContainEqual(['cards', 10])
    expect(keys).toContainEqual(['cards', 'count'])
    expect(keys).toContainEqual(['decks'])
  })
})

describe('useMoveCardMutation', () => {
  test('mutation delegates to moveCard, stripping deck_id from the params it forwards', async () => {
    const { mutation } = configFrom(useMoveCardMutation)
    await mutation({ deck_id: 10, card_id: 42, anchor_id: 7, side: 'after' })
    expect(moveCardMock).toHaveBeenCalledWith({ card_id: 42, anchor_id: 7, side: 'after' })
  })

  test('onSettled invalidates only the affected deck (counts unchanged by reorder)', () => {
    const { onSettled } = configFrom(useMoveCardMutation)
    onSettled(1500, undefined, { deck_id: 10, card_id: 42, anchor_id: 7, side: 'after' })
    const keys = invalidatedKeys()
    expect(keys).toContainEqual(['deck', 10])
    expect(keys).toContainEqual(['cards', 10])
    expect(keys).not.toContainEqual(['cards', 'count'])
    expect(keys).not.toContainEqual(['decks'])
  })
})

describe('useMoveCardsToDeckMutation', () => {
  test('explicit mode: invalidates every source deck plus the target', () => {
    const { onSettled } = configFrom(useMoveCardsToDeckMutation)

    onSettled(undefined, undefined, {
      target_deck_id: 20,
      card_ids: [1, 2],
      source_deck_ids: [10]
    })

    const keys = invalidatedKeys()
    expect(keys).toContainEqual(['deck', 10])
    expect(keys).toContainEqual(['deck', 20])
    expect(keys).toContainEqual(['cards', 10])
    expect(keys).toContainEqual(['cards', 20])
  })

  test('explicit mode: handles multiple source decks', () => {
    const { onSettled } = configFrom(useMoveCardsToDeckMutation)

    onSettled(undefined, undefined, {
      target_deck_id: 20,
      card_ids: [1, 2],
      source_deck_ids: [10, 30]
    })

    const keys = invalidatedKeys()
    expect(keys).toContainEqual(['deck', 10])
    expect(keys).toContainEqual(['deck', 30])
    expect(keys).toContainEqual(['deck', 20])
  })

  test('select-all mode: invalidates source + target from vars', () => {
    const { onSettled } = configFrom(useMoveCardsToDeckMutation)

    onSettled(undefined, undefined, {
      target_deck_id: 20,
      source_deck_id: 10,
      except_ids: []
    })

    const keys = invalidatedKeys()
    expect(keys).toContainEqual(['deck', 10])
    expect(keys).toContainEqual(['deck', 20])
  })

  // Regression: target/source decks may not be currently mounted after a
  // cross-deck move. Default invalidate only refetches active queries, so
  // stale cached pages render when the user navigates to the target deck.
  // Pinia Colada's second-arg `'all'` forces refetch for inactive queries too.
  test('deck-scoped invalidations pass "all" so non-active deck queries refetch', () => {
    const { onSettled } = configFrom(useMoveCardsToDeckMutation)
    invalidateSpy.mockClear()
    onSettled(undefined, undefined, {
      target_deck_id: 20,
      card_ids: [1],
      source_deck_ids: [10]
    })

    const deck_calls = invalidateSpy.mock.calls.filter(
      ([filters]) => filters.key[0] === 'deck' || filters.key[0] === 'cards'
    )
    const deck_scoped = deck_calls.filter(([filters]) => typeof filters.key[1] === 'number')
    expect(deck_scoped.length).toBeGreaterThan(0)
    deck_scoped.forEach(([, refetch_mode]) => {
      expect(refetch_mode).toBe('all')
    })
  })

  test('explicit mode: delegates to moveCardsToDeck with target + card_ids', async () => {
    const { mutation } = configFrom(useMoveCardsToDeckMutation)
    await mutation({ target_deck_id: 20, card_ids: [1, 2], source_deck_ids: [10] })
    expect(moveCardsToDeckMock).toHaveBeenCalledWith({ target_deck_id: 20, card_ids: [1, 2] })
  })

  test('select-all mode: delegates to moveCardsToDeck with target + source + except_ids', async () => {
    const { mutation } = configFrom(useMoveCardsToDeckMutation)
    await mutation({ target_deck_id: 20, source_deck_id: 10, except_ids: [7] })
    expect(moveCardsToDeckMock).toHaveBeenCalledWith({
      target_deck_id: 20,
      source_deck_id: 10,
      except_ids: [7]
    })
  })

  // [obligation] Mutation invalidation contract — hook owns its own invalidation.
  // Both discriminated shapes must invalidate in onSettled without caller help.
  test('explicit mode onSettled invalidates all card counts (moves shift deck totals)', () => {
    const { onSettled } = configFrom(useMoveCardsToDeckMutation)
    invalidateSpy.mockClear()
    onSettled(undefined, undefined, {
      target_deck_id: 20,
      card_ids: [1],
      source_deck_ids: [10]
    })
    const keys = invalidatedKeys()
    expect(keys).toContainEqual(['cards', 'count'])
    expect(keys).toContainEqual(['decks'])
  })

  test('select-all mode onSettled invalidates all card counts', () => {
    const { onSettled } = configFrom(useMoveCardsToDeckMutation)
    invalidateSpy.mockClear()
    onSettled(undefined, undefined, {
      target_deck_id: 20,
      source_deck_id: 10,
      except_ids: [3]
    })
    const keys = invalidatedKeys()
    expect(keys).toContainEqual(['cards', 'count'])
    expect(keys).toContainEqual(['decks'])
  })

  // [obligation] Hook must NOT rely on caller to invalidate — onSettled fires
  // even on error (it's onSettled, not onSuccess).
  test('explicit mode onSettled fires on error too (not just on success)', () => {
    const { onSettled } = configFrom(useMoveCardsToDeckMutation)
    invalidateSpy.mockClear()
    const err = new Error('network')
    onSettled(undefined, err, {
      target_deck_id: 20,
      card_ids: [1],
      source_deck_ids: [10]
    })
    // Even on error the hook invalidates so stale data is cleared
    const keys = invalidatedKeys()
    expect(keys).toContainEqual(['deck', 20])
    expect(keys).toContainEqual(['deck', 10])
  })

  test('select-all mode onSettled fires on error too', () => {
    const { onSettled } = configFrom(useMoveCardsToDeckMutation)
    invalidateSpy.mockClear()
    const err = new Error('network')
    onSettled(undefined, err, {
      target_deck_id: 20,
      source_deck_id: 10,
      except_ids: []
    })
    const keys = invalidatedKeys()
    expect(keys).toContainEqual(['deck', 20])
    expect(keys).toContainEqual(['deck', 10])
  })

  test('onSettled invalidates card index — deck membership changes alter highlights [obligation]', () => {
    const { onSettled } = configFrom(useMoveCardsToDeckMutation)
    invalidateSpy.mockClear()
    onSettled(undefined, undefined, {
      target_deck_id: 20,
      card_ids: [1],
      source_deck_ids: [10]
    })
    expect(invalidatedKeys()).toContainEqual(['cards', 'index'])
  })
})
