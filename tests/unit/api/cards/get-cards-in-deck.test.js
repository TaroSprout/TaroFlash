import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { rpcMock } = vi.hoisted(() => {
  const rpcMock = vi.fn()
  return { rpcMock }
})

vi.mock('@/supabase-client', () => ({
  supabase: { rpc: rpcMock }
}))

vi.mock('@/utils/logger', () => ({ default: { error: vi.fn() } }))

// ── Import ─────────────────────────────────────────────────────────────────────

import { fetchCardsInDeck } from '@/api/cards/db/get-cards-in-deck'

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  rpcMock.mockReset()
})

describe('fetchCardsInDeck', () => {
  test('calls the get_cards_in_deck RPC with the correct parameter mapping', async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null })
    await fetchCardsInDeck({ deck_id: 7, sort_by: 'default', query: null, offset: 0, limit: 50 })
    expect(rpcMock).toHaveBeenCalledWith('get_cards_in_deck', {
      p_deck_id: 7,
      p_sort_by: 'default',
      p_query: null,
      p_offset: 0,
      p_limit: 50
    })
  })

  test('passes a non-null query string through to p_query for ilike filtering [obligation]', async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null })
    await fetchCardsInDeck({
      deck_id: 5,
      sort_by: 'difficulty',
      query: 'cat',
      offset: 0,
      limit: 50
    })
    expect(rpcMock).toHaveBeenCalledWith(
      'get_cards_in_deck',
      expect.objectContaining({ p_query: 'cat', p_sort_by: 'difficulty' })
    )
  })

  test('passes null query to p_query — empty string must not reach the RPC [obligation]', async () => {
    // The query layer converts empty string → null before calling this function.
    // This test verifies null is preserved as-is (no accidental coercion to '').
    rpcMock.mockResolvedValueOnce({ data: [], error: null })
    await fetchCardsInDeck({ deck_id: 5, sort_by: 'default', query: null, offset: 100, limit: 50 })
    expect(rpcMock).toHaveBeenCalledWith(
      'get_cards_in_deck',
      expect.objectContaining({ p_query: null, p_offset: 100 })
    )
  })

  test('returns the rows from the RPC response', async () => {
    const rows = [
      { id: 1, front_text: 'Q' },
      { id: 2, front_text: 'W' }
    ]
    rpcMock.mockResolvedValueOnce({ data: rows, error: null })
    const result = await fetchCardsInDeck({
      deck_id: 10,
      sort_by: 'default',
      query: null,
      offset: 0,
      limit: 50
    })
    expect(result).toEqual(rows)
  })

  test('throws when the RPC returns an error', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'rpc boom' } })
    await expect(
      fetchCardsInDeck({ deck_id: 10, sort_by: 'default', query: null, offset: 0, limit: 50 })
    ).rejects.toThrow('rpc boom')
  })

  test('passes offset and limit as p_offset and p_limit for pagination', async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null })
    await fetchCardsInDeck({ deck_id: 3, sort_by: 'default', query: null, offset: 150, limit: 50 })
    expect(rpcMock).toHaveBeenCalledWith(
      'get_cards_in_deck',
      expect.objectContaining({ p_offset: 150, p_limit: 50 })
    )
  })
})
