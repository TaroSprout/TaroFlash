import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { useMutationSpy, moveCardsToDeckMock, invalidateSpy } = vi.hoisted(() => ({
  useMutationSpy: vi.fn((cfg) => cfg),
  moveCardsToDeckMock: vi.fn().mockResolvedValue(undefined),
  invalidateSpy: vi.fn()
}))

vi.mock('@pinia/colada', () => ({
  useMutation: useMutationSpy,
  useQueryCache: () => ({ invalidateQueries: invalidateSpy })
}))

vi.mock('@/api/cards/db', () => ({ moveCardsToDeck: moveCardsToDeckMock }))

import { useMoveCardsToDeckMutation } from '@/api/cards/mutations/move-to-deck'

function config() {
  useMoveCardsToDeckMutation()
  return useMutationSpy.mock.calls.at(-1)[0]
}

beforeEach(() => {
  useMutationSpy.mockClear()
  moveCardsToDeckMock.mockClear()
  invalidateSpy.mockClear()
})

describe('useMoveCardsToDeckMutation — mutation()', () => {
  test('explicit selection: forwards target_deck_id + card_ids to the db call', async () => {
    const { mutation } = config()
    await mutation({ target_deck_id: 20, card_ids: [1, 2], source_deck_ids: [5] })
    expect(moveCardsToDeckMock).toHaveBeenCalledWith({ target_deck_id: 20, card_ids: [1, 2] })
  })

  test('whole-deck move: forwards source_deck_id, except_ids, and count to the db call', async () => {
    const { mutation } = config()
    await mutation({ target_deck_id: 20, source_deck_id: 10, except_ids: [7], count: 3 })
    expect(moveCardsToDeckMock).toHaveBeenCalledWith({
      target_deck_id: 20,
      source_deck_id: 10,
      except_ids: [7],
      count: 3
    })
  })
})

describe('useMoveCardsToDeckMutation — onSettled()', () => {
  test('invalidates every source deck with refetch_inactive [obligation]', () => {
    const { onSettled } = config()
    onSettled(undefined, undefined, {
      target_deck_id: 20,
      card_ids: [1],
      source_deck_ids: [5, 6]
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['deck', 5] }, 'all')
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['deck', 6] }, 'all')
  })

  test('invalidates the single source deck for a whole-deck move', () => {
    const { onSettled } = config()
    onSettled(undefined, undefined, {
      target_deck_id: 20,
      source_deck_id: 10,
      except_ids: [],
      count: 1
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['deck', 10] }, 'all')
  })

  test('invalidates the target deck with refetch_inactive — user may be on neither deck [obligation]', () => {
    const { onSettled } = config()
    onSettled(undefined, undefined, { target_deck_id: 20, card_ids: [1], source_deck_ids: [5] })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['deck', 20] }, 'all')
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['cards', 20] }, 'all')
  })

  test('invalidates card counts and the card index', () => {
    const { onSettled } = config()
    onSettled(undefined, undefined, { target_deck_id: 20, card_ids: [1], source_deck_ids: [5] })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['cards', 'count'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['decks'], exact: true })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['cards', 'index'] })
  })
})
