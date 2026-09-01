import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { insertMock, selectMock, singleMock, fromMock, tailRankMock, rankBetweenMock } = vi.hoisted(
  () => {
    const singleMock = vi.fn()
    const selectMock = vi.fn(() => ({ single: singleMock }))
    const insertMock = vi.fn(() => ({ select: selectMock }))
    const fromMock = vi.fn(() => ({ insert: insertMock }))
    return {
      insertMock,
      selectMock,
      singleMock,
      fromMock,
      tailRankMock: vi.fn(),
      rankBetweenMock: vi.fn()
    }
  }
)

vi.mock('@/supabase-client', () => ({
  supabase: { from: fromMock }
}))

vi.mock('@/utils/logger', () => ({ default: { error: vi.fn() } }))

vi.mock('@/utils/card/rank', () => ({ rankBetween: rankBetweenMock }))

vi.mock('@/api/cards/db/tail-rank', () => ({ fetchDeckTailRank: tailRankMock }))

import { insertCard } from '@/api/cards/db/insert'

describe('insertCard', () => {
  beforeEach(() => {
    fromMock.mockClear()
    insertMock.mockClear()
    selectMock.mockClear()
    singleMock.mockReset()
    tailRankMock.mockReset()
    rankBetweenMock.mockReset()
  })

  test('plain insert against the cards table, no RPC', async () => {
    singleMock.mockResolvedValueOnce({ data: { id: 1, rank: 'a0' }, error: null })

    await insertCard({ deck_id: 10, rank: 'a0', front_text: 'Q', back_text: 'A' })

    expect(fromMock).toHaveBeenCalledWith('cards')
    expect(insertMock).toHaveBeenCalledWith({
      deck_id: 10,
      rank: 'a0',
      front_text: 'Q',
      back_text: 'A',
      note: null
    })
  })

  test('uses the given rank as-is without looking up the deck tail', async () => {
    singleMock.mockResolvedValueOnce({ data: { id: 1, rank: 'a0' }, error: null })

    await insertCard({ deck_id: 10, rank: 'a0', front_text: 'Q', back_text: 'A' })

    expect(tailRankMock).not.toHaveBeenCalled()
    expect(rankBetweenMock).not.toHaveBeenCalled()
  })

  test('mints a key after the deck tail when rank is omitted (append)', async () => {
    tailRankMock.mockResolvedValueOnce('a0')
    rankBetweenMock.mockReturnValueOnce('a1')
    singleMock.mockResolvedValueOnce({ data: { id: 1, rank: 'a1' }, error: null })

    await insertCard({ deck_id: 10, front_text: 'Q', back_text: 'A' })

    expect(tailRankMock).toHaveBeenCalledWith(10)
    expect(rankBetweenMock).toHaveBeenCalledWith({ prev: 'a0', next: null })
    const [payload] = insertMock.mock.calls[0]
    expect(payload.rank).toBe('a1')
  })

  test('mints the first key of an empty deck when rank is omitted and the deck is empty', async () => {
    tailRankMock.mockResolvedValueOnce(null)
    rankBetweenMock.mockReturnValueOnce('a0')
    singleMock.mockResolvedValueOnce({ data: { id: 1, rank: 'a0' }, error: null })

    await insertCard({ deck_id: 10, front_text: 'Q', back_text: 'A' })

    expect(rankBetweenMock).toHaveBeenCalledWith({ prev: null, next: null })
  })

  test('returns id + rank from the response', async () => {
    singleMock.mockResolvedValueOnce({ data: { id: 42, rank: 'a5' }, error: null })

    const result = await insertCard({ deck_id: 10, rank: 'a5', front_text: '', back_text: '' })

    expect(result).toEqual({ id: 42, rank: 'a5' })
  })

  test('defaults note to null when not provided', async () => {
    singleMock.mockResolvedValueOnce({ data: { id: 1, rank: 'a0' }, error: null })

    await insertCard({ deck_id: 10, rank: 'a0', front_text: 'Q', back_text: 'A' })

    const [payload] = insertMock.mock.calls[0]
    expect(payload.note).toBeNull()
  })

  test('forwards note when provided', async () => {
    singleMock.mockResolvedValueOnce({ data: { id: 1, rank: 'a0' }, error: null })

    await insertCard({
      deck_id: 10,
      rank: 'a0',
      front_text: 'Q',
      back_text: 'A',
      note: 'contextual note'
    })

    const [payload] = insertMock.mock.calls[0]
    expect(payload.note).toBe('contextual note')
  })

  test('throws when the insert errors', async () => {
    const err = new Error('deck not found')
    singleMock.mockResolvedValueOnce({ data: null, error: err })

    await expect(
      insertCard({ deck_id: 10, rank: 'a0', front_text: '', back_text: '' })
    ).rejects.toBe(err)
  })
})
