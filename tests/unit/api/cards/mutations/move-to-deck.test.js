import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn()
}))

vi.mock('@/supabase-client', () => ({
  supabase: { rpc: rpcMock }
}))

vi.mock('@/utils/logger', () => ({ default: { error: vi.fn() } }))

import { moveCardsToDeck } from '@/api/cards/db/move-to-deck'
import logger from '@/utils/logger'

describe('moveCardsToDeck', () => {
  beforeEach(() => {
    rpcMock.mockReset()
    logger.error.mockReset()
  })

  test('explicit mode: calls move_cards_to_deck RPC with correct params', async () => {
    rpcMock.mockResolvedValueOnce({ error: null })
    await moveCardsToDeck({ target_deck_id: 20, card_ids: [1, 2] })
    expect(rpcMock).toHaveBeenCalledWith('move_cards_to_deck', {
      p_target_deck_id: 20,
      p_card_ids: [1, 2],
      p_source_deck_id: null,
      p_except_ids: null
    })
  })

  test('select-all mode: calls move_cards_to_deck RPC with source + except params', async () => {
    rpcMock.mockResolvedValueOnce({ error: null })
    await moveCardsToDeck({ target_deck_id: 20, source_deck_id: 10, except_ids: [7] })
    expect(rpcMock).toHaveBeenCalledWith('move_cards_to_deck', {
      p_target_deck_id: 20,
      p_card_ids: null,
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
