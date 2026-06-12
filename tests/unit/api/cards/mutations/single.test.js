import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { useMutationSpy, invalidateSpy, upsertCardMock, insertCardAtMock } = vi.hoisted(() => ({
  useMutationSpy: vi.fn((cfg) => cfg),
  invalidateSpy: vi.fn(),
  upsertCardMock: vi.fn().mockResolvedValue({}),
  insertCardAtMock: vi.fn().mockResolvedValue({ id: 9, rank: 1000 })
}))

vi.mock('@pinia/colada', () => ({
  useMutation: useMutationSpy,
  useQueryCache: () => ({ invalidateQueries: invalidateSpy })
}))

vi.mock('@/api/cards/db', () => ({
  upsertCard: upsertCardMock,
  insertCardAt: insertCardAtMock
}))

import { useUpsertCardMutation } from '@/api/cards/mutations/upsert'
import { useInsertCardAtMutation } from '@/api/cards/mutations/insert'

beforeEach(() => {
  useMutationSpy.mockClear()
  invalidateSpy.mockClear()
  upsertCardMock.mockClear()
  insertCardAtMock.mockClear()
})

function configFrom(hook) {
  hook()
  return useMutationSpy.mock.calls.at(-1)[0]
}

describe('useUpsertCardMutation', () => {
  test('mutation delegates to upsertCard', async () => {
    const { mutation } = configFrom(useUpsertCardMutation)
    await mutation({ id: 1, deck_id: 10, front_text: 'x' })
    expect(upsertCardMock).toHaveBeenCalledWith({ id: 1, deck_id: 10, front_text: 'x' })
  })

  test("onSettled invalidates the card's deck", () => {
    const { onSettled } = configFrom(useUpsertCardMutation)
    onSettled(undefined, undefined, { id: 1, deck_id: 10 })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['deck', 10] })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['cards', 10] })
  })

  test('onSettled invalidates card index — upserted front text changes highlights [obligation]', () => {
    const { onSettled } = configFrom(useUpsertCardMutation)
    onSettled(undefined, undefined, { id: 1, deck_id: 10 })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['cards', 'index'] })
  })
})

describe('useInsertCardAtMutation', () => {
  test('mutation delegates to insertCardAt', async () => {
    const { mutation } = configFrom(useInsertCardAtMutation)
    const params = {
      deck_id: 10,
      anchor_id: null,
      side: null,
      front_text: 'Q',
      back_text: 'A'
    }
    await mutation(params)
    expect(insertCardAtMock).toHaveBeenCalledWith(params)
  })

  test('onSettled invalidates the deck + all card counts (card creation shifts deck totals)', () => {
    const { onSettled } = configFrom(useInsertCardAtMutation)
    onSettled({ id: 9, rank: 1000 }, undefined, {
      deck_id: 10,
      anchor_id: null,
      side: null,
      front_text: '',
      back_text: ''
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['deck', 10] })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['cards', 10] })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['cards', 'count'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['decks'] })
  })

  test('onSettled invalidates card index — new front text must appear in highlights [obligation]', () => {
    const { onSettled } = configFrom(useInsertCardAtMutation)
    onSettled({ id: 9, rank: 1000 }, undefined, {
      deck_id: 10,
      anchor_id: null,
      side: null,
      front_text: 'Q',
      back_text: 'A'
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['cards', 'index'] })
  })
})
