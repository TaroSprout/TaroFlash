import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { useMutationSpy, invalidateSpy, upsertCardMock, insertCardAtMock, insertCardMock } =
  vi.hoisted(() => ({
    useMutationSpy: vi.fn((cfg) => cfg),
    invalidateSpy: vi.fn(),
    upsertCardMock: vi.fn().mockResolvedValue({}),
    insertCardAtMock: vi.fn().mockResolvedValue({ id: 9, rank: 1000 }),
    insertCardMock: vi.fn().mockResolvedValue({ id: 9, rank: 'a5' })
  }))

vi.mock('@pinia/colada', () => ({
  useMutation: useMutationSpy,
  useQueryCache: () => ({ invalidateQueries: invalidateSpy })
}))

vi.mock('@/api/cards/db', () => ({
  upsertCard: upsertCardMock,
  insertCardAt: insertCardAtMock,
  insertCard: insertCardMock
}))

import { useUpsertCardMutation } from '@/api/cards/mutations/upsert'
import { useInsertCardMutation } from '@/api/cards/mutations/insert'

beforeEach(() => {
  useMutationSpy.mockClear()
  invalidateSpy.mockClear()
  upsertCardMock.mockClear()
  insertCardAtMock.mockClear()
  insertCardMock.mockClear()
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

describe('useInsertCardMutation', () => {
  test('mutation delegates to insertCard (plain table write, no RPC) [obligation]', async () => {
    const { mutation } = configFrom(useInsertCardMutation)
    const params = { deck_id: 10, rank: 'a5', front_text: 'Q', back_text: 'A' }
    await mutation(params)
    expect(insertCardMock).toHaveBeenCalledWith(params)
    expect(insertCardAtMock).not.toHaveBeenCalled()
  })

  test('onSettled invalidates the deck + all card counts (card creation shifts deck totals)', () => {
    const { onSettled } = configFrom(useInsertCardMutation)
    onSettled({ id: 9, rank: 'a5' }, undefined, {
      deck_id: 10,
      front_text: 'Q',
      back_text: 'A'
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['deck', 10] })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['cards', 10] })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['cards', 'count'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['decks'], exact: true })
  })

  test('onSettled invalidates card index — new front text must appear in highlights [obligation]', () => {
    const { onSettled } = configFrom(useInsertCardMutation)
    onSettled({ id: 9, rank: 'a5' }, undefined, {
      deck_id: 10,
      front_text: 'Q',
      back_text: 'A'
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['cards', 'index'] })
  })
})
