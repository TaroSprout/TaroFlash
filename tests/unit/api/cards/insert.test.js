import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn()
}))

vi.mock('@/supabase-client', () => ({
  supabase: { rpc: rpcMock }
}))

vi.mock('@/utils/logger', () => ({ default: { error: vi.fn() } }))

import { insertCardAt } from '@/api/cards/db/insert'

describe('insertCardAt', () => {
  beforeEach(() => {
    rpcMock.mockReset()
  })

  test('calls the insert_card_at RPC with the expected param shape', async () => {
    rpcMock.mockResolvedValueOnce({ data: [{ id: 1, rank: 1500 }], error: null })

    await insertCardAt({
      deck_id: 10,
      anchor_id: 1,
      side: 'after',
      front_text: 'Q',
      back_text: 'A'
    })

    expect(rpcMock).toHaveBeenCalledWith('insert_card_at', {
      p_deck_id: 10,
      p_anchor_id: 1,
      p_side: 'after',
      p_front_text: 'Q',
      p_back_text: 'A'
    })
  })

  test('returns the first row (id + rank) from the RPC response', async () => {
    rpcMock.mockResolvedValueOnce({ data: [{ id: 42, rank: 2500 }], error: null })

    const result = await insertCardAt({
      deck_id: 10,
      anchor_id: null,
      side: null,
      front_text: '',
      back_text: ''
    })

    expect(result).toEqual({ id: 42, rank: 2500 })
  })

  test('forwards null anchor + side unchanged (used for empty-deck inserts)', async () => {
    rpcMock.mockResolvedValueOnce({ data: [{ id: 1, rank: 1000 }], error: null })

    await insertCardAt({
      deck_id: 10,
      anchor_id: null,
      side: null,
      front_text: 'Q',
      back_text: 'A'
    })

    const [, args] = rpcMock.mock.calls[0]
    expect(args.p_anchor_id).toBeNull()
    expect(args.p_side).toBeNull()
  })

  test('throws when the RPC returns an error', async () => {
    const err = new Error('deck not found')
    rpcMock.mockResolvedValueOnce({ data: null, error: err })

    await expect(
      insertCardAt({
        deck_id: 10,
        anchor_id: null,
        side: null,
        front_text: '',
        back_text: ''
      })
    ).rejects.toBe(err)
  })

  test('forwards note as p_note when provided [obligation]', async () => {
    rpcMock.mockResolvedValueOnce({ data: [{ id: 1, rank: 1000 }], error: null })

    await insertCardAt({
      deck_id: 10,
      anchor_id: null,
      side: null,
      front_text: 'Q',
      back_text: 'A',
      note: 'contextual note'
    })

    const [, args] = rpcMock.mock.calls[0]
    expect(args.p_note).toBe('contextual note')
  })

  test('omits p_note (undefined, not null) when note is absent [obligation]', async () => {
    rpcMock.mockResolvedValueOnce({ data: [{ id: 1, rank: 1000 }], error: null })

    await insertCardAt({
      deck_id: 10,
      anchor_id: null,
      side: null,
      front_text: 'Q',
      back_text: 'A'
    })

    const [, args] = rpcMock.mock.calls[0]
    // note is absent → params.note ?? undefined → key should not be set at all (or be undefined)
    expect(args.p_note).toBeUndefined()
  })

  test('omits p_note (undefined) when note is explicitly null [obligation]', async () => {
    rpcMock.mockResolvedValueOnce({ data: [{ id: 1, rank: 1000 }], error: null })

    await insertCardAt({
      deck_id: 10,
      anchor_id: null,
      side: null,
      front_text: 'Q',
      back_text: 'A',
      note: null
    })

    const [, args] = rpcMock.mock.calls[0]
    // null ?? undefined → undefined
    expect(args.p_note).toBeUndefined()
  })
})
