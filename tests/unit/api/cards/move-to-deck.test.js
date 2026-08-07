import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { rpcMock, tailRankMock, ranksBetweenMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  tailRankMock: vi.fn(),
  ranksBetweenMock: vi.fn()
}))

vi.mock('@/supabase-client', () => ({
  supabase: { rpc: rpcMock }
}))

vi.mock('@/utils/logger', () => ({ default: { error: vi.fn() } }))

vi.mock('@/utils/card/rank', () => ({ ranksBetween: ranksBetweenMock }))

vi.mock('@/api/cards/db/tail-rank', () => ({ fetchDeckTailRank: tailRankMock }))

import { moveCardsToDeck } from '@/api/cards/db/move-to-deck'
import logger from '@/utils/logger'

describe('moveCardsToDeck', () => {
  beforeEach(() => {
    rpcMock.mockReset()
    tailRankMock.mockReset()
    ranksBetweenMock.mockReset()
    logger.error.mockReset()
    tailRankMock.mockResolvedValue('a0')
    ranksBetweenMock.mockReturnValue(['a1'])
  })

  test('explicit selection: mints exactly card_ids.length keys, no count lookup [obligation]', async () => {
    rpcMock.mockResolvedValueOnce({ error: null })
    ranksBetweenMock.mockReturnValueOnce(['a1', 'a2'])

    await moveCardsToDeck({ target_deck_id: 20, card_ids: [1, 2] })

    expect(ranksBetweenMock).toHaveBeenCalledWith({ prev: 'a0', next: null }, 2)
  })

  test('whole-deck move: mints the caller-supplied count of keys, not a queried count [obligation]', async () => {
    rpcMock.mockResolvedValueOnce({ error: null })
    ranksBetweenMock.mockReturnValueOnce(Array.from({ length: 7 }, () => 'a1'))

    await moveCardsToDeck({
      target_deck_id: 20,
      source_deck_id: 10,
      except_ids: [7],
      count: 7
    })

    expect(ranksBetweenMock).toHaveBeenCalledWith({ prev: 'a0', next: null }, 7)
  })

  test('mints ranks after the target deck tail [obligation]', async () => {
    rpcMock.mockResolvedValueOnce({ error: null })
    tailRankMock.mockResolvedValueOnce('z5')

    await moveCardsToDeck({ target_deck_id: 20, card_ids: [1] })

    expect(tailRankMock).toHaveBeenCalledWith(20)
    expect(ranksBetweenMock).toHaveBeenCalledWith({ prev: 'z5', next: null }, 1)
  })

  test('is a no-op when the explicit selection is empty — no rank mint, no RPC call', async () => {
    await moveCardsToDeck({ target_deck_id: 20, card_ids: [] })

    expect(tailRankMock).not.toHaveBeenCalled()
    expect(rpcMock).not.toHaveBeenCalled()
  })

  test('explicit mode: calls move_cards_to_deck with p_card_ids set, p_source_deck_id undefined [obligation]', async () => {
    rpcMock.mockResolvedValueOnce({ error: null })
    ranksBetweenMock.mockReturnValueOnce(['a1', 'a2'])

    await moveCardsToDeck({ target_deck_id: 20, card_ids: [1, 2] })

    expect(rpcMock).toHaveBeenCalledWith('move_cards_to_deck', {
      p_target_deck_id: 20,
      p_ranks: ['a1', 'a2'],
      p_card_ids: [1, 2],
      p_source_deck_id: undefined,
      p_except_ids: undefined
    })
  })

  test('whole-deck mode: calls move_cards_to_deck with p_source_deck_id set, p_card_ids undefined [obligation]', async () => {
    rpcMock.mockResolvedValueOnce({ error: null })

    await moveCardsToDeck({
      target_deck_id: 20,
      source_deck_id: 10,
      except_ids: [7],
      count: 1
    })

    expect(rpcMock).toHaveBeenCalledWith('move_cards_to_deck', {
      p_target_deck_id: 20,
      p_ranks: ['a1'],
      p_card_ids: undefined,
      p_source_deck_id: 10,
      p_except_ids: [7]
    })
  })

  test('resolves without returning a value on success', async () => {
    rpcMock.mockResolvedValueOnce({ error: null })
    const result = await moveCardsToDeck({ target_deck_id: 20, card_ids: [1] })
    expect(result).toBeUndefined()
  })

  test('logs and rethrows the error when the RPC fails', async () => {
    const err = new Error('deck_card_limit_exceeded')
    rpcMock.mockResolvedValueOnce({ error: err })
    await expect(moveCardsToDeck({ target_deck_id: 20, card_ids: [1] })).rejects.toBe(err)
    expect(logger.error).toHaveBeenCalledWith(err.message)
  })
})
