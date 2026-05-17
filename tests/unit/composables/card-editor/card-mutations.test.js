import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { ref } from 'vue'
import { card } from '@tests/fixtures/card'

const { insertCardAtMock, saveCardMock, deleteCardsMock, deleteCardsInDeckMock, moveCardsMock } =
  vi.hoisted(() => ({
    insertCardAtMock: vi.fn(),
    saveCardMock: vi.fn(),
    deleteCardsMock: vi.fn(),
    deleteCardsInDeckMock: vi.fn(),
    moveCardsMock: vi.fn()
  }))

vi.mock('@/api/cards', () => ({
  useInsertCardAtMutation: () => ({ mutate: insertCardAtMock, mutateAsync: insertCardAtMock }),
  useSaveCardMutation: () => ({ mutate: saveCardMock, mutateAsync: saveCardMock }),
  useDeleteCardsMutation: () => ({ mutate: deleteCardsMock, mutateAsync: deleteCardsMock }),
  useDeleteCardsInDeckMutation: () => ({
    mutate: deleteCardsInDeckMock,
    mutateAsync: deleteCardsInDeckMock
  }),
  useMoveCardsToDeckMutation: () => ({ mutate: moveCardsMock, mutateAsync: moveCardsMock })
}))

import { useCardMutations } from '@/composables/card-editor/card-mutations'

function makeCard(overrides = {}) {
  return card.one({ overrides })
}

function makeMutations(deck_id = 10) {
  return useCardMutations(ref(deck_id))
}

beforeEach(() => {
  insertCardAtMock.mockReset()
  insertCardAtMock.mockResolvedValue({ id: 7000, rank: 1500 })
  saveCardMock.mockReset()
  saveCardMock.mockResolvedValue(undefined)
  deleteCardsMock.mockReset()
  deleteCardsMock.mockResolvedValue(undefined)
  deleteCardsInDeckMock.mockReset()
  deleteCardsInDeckMock.mockResolvedValue(0)
  moveCardsMock.mockReset()
  moveCardsMock.mockResolvedValue(undefined)
})

describe('useCardMutations', () => {
  describe('insertCard', () => {
    test('forwards params to insertCardAt and returns the result', async () => {
      const m = makeMutations()
      const params = {
        deck_id: 10,
        anchor_id: 42,
        side: 'after',
        front_text: 'Q',
        back_text: 'A'
      }
      const result = await m.insertCard(params)
      expect(insertCardAtMock).toHaveBeenCalledWith(params)
      expect(result).toEqual({ id: 7000, rank: 1500 })
    })
  })

  describe('saveCard', () => {
    test('forwards card + values to saveCard', async () => {
      const m = makeMutations()
      const c = makeCard({ id: 42 })
      await m.saveCard(c, { front_text: 'X' })
      expect(saveCardMock).toHaveBeenCalledWith({ card: c, values: { front_text: 'X' } })
    })

    test('does not mutate the card it is given', async () => {
      const m = makeMutations()
      const c = makeCard({ id: 42, front_text: 'before' })
      await m.saveCard(c, { front_text: 'after' })
      expect(c.front_text).toBe('before')
    })
  })

  describe('deleteCards', () => {
    test('routes { cards } to the positive-delete mutation', async () => {
      const m = makeMutations()
      const cards = [makeCard({ id: 1 })]
      await m.deleteCards({ cards })
      expect(deleteCardsMock).toHaveBeenCalledWith(cards)
      expect(deleteCardsInDeckMock).not.toHaveBeenCalled()
    })

    test('routes { except_ids } to the deck-wide-delete mutation', async () => {
      const m = makeMutations(10)
      await m.deleteCards({ except_ids: [5, 6] })
      expect(deleteCardsInDeckMock).toHaveBeenCalledWith({ deck_id: 10, except_ids: [5, 6] })
      expect(deleteCardsMock).not.toHaveBeenCalled()
    })

    test('is a no-op when { cards } is empty', async () => {
      const m = makeMutations()
      await m.deleteCards({ cards: [] })
      expect(deleteCardsMock).not.toHaveBeenCalled()
    })
  })

  describe('moveCards', () => {
    test('passes explicit-mode vars straight through to the move mutation', async () => {
      const m = makeMutations()
      const vars = { target_deck_id: 99, card_ids: [7], source_deck_ids: [42] }
      await m.moveCards(vars)
      expect(moveCardsMock).toHaveBeenCalledWith(vars)
    })

    test('passes select-all-mode vars straight through to the move mutation', async () => {
      const m = makeMutations()
      const vars = { target_deck_id: 99, source_deck_id: 42, except_ids: [3] }
      await m.moveCards(vars)
      expect(moveCardsMock).toHaveBeenCalledWith(vars)
    })

    test('is a no-op when the card_ids array is empty', async () => {
      const m = makeMutations()
      await m.moveCards({ target_deck_id: 99, card_ids: [], source_deck_ids: [] })
      expect(moveCardsMock).not.toHaveBeenCalled()
    })
  })
})
