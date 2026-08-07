import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn()
}))

vi.mock('@/supabase-client', () => ({
  supabase: { rpc: rpcMock }
}))

vi.mock('@/utils/logger', () => ({ default: { error: vi.fn() } }))

import { fetchCardsInDeck } from '@/api/cards/db/get-cards-in-deck'

beforeEach(() => {
  rpcMock.mockReset()
})

function row(id) {
  return { id, rank: `rank-${id}` }
}

describe('fetchCardsInDeck', () => {
  test('requests p_limit + 1 rows from the RPC — the lookahead row [obligation]', async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null })
    await fetchCardsInDeck({ deck_id: 7, sort_by: 'default', query: null, offset: 0, limit: 50 })
    expect(rpcMock).toHaveBeenCalledWith('get_cards_in_deck', {
      p_deck_id: 7,
      p_sort_by: 'default',
      p_query: null,
      p_offset: 0,
      p_limit: 51
    })
  })

  test('passes a non-null query string through to p_query for ilike filtering', async () => {
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

  test('caps cards at limit even when the RPC returns the extra lookahead row [obligation]', async () => {
    const rows = [row(1), row(2), row(3)]
    rpcMock.mockResolvedValueOnce({ data: rows, error: null })

    const page = await fetchCardsInDeck({
      deck_id: 10,
      sort_by: 'default',
      query: null,
      offset: 0,
      limit: 2
    })

    expect(page.cards).toEqual([row(1), row(2)])
  })

  test('next_rank is the rank of the extra row past the page [obligation]', async () => {
    const rows = [row(1), row(2), row(3)]
    rpcMock.mockResolvedValueOnce({ data: rows, error: null })

    const page = await fetchCardsInDeck({
      deck_id: 10,
      sort_by: 'default',
      query: null,
      offset: 0,
      limit: 2
    })

    expect(page.next_rank).toBe('rank-3')
  })

  test('next_rank is null at the end of the deck (fewer rows than limit + 1) [obligation]', async () => {
    const rows = [row(1), row(2)]
    rpcMock.mockResolvedValueOnce({ data: rows, error: null })

    const page = await fetchCardsInDeck({
      deck_id: 10,
      sort_by: 'default',
      query: null,
      offset: 0,
      limit: 2
    })

    expect(page.cards).toEqual([row(1), row(2)])
    expect(page.next_rank).toBeNull()
  })

  test('throws when the RPC returns an error', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'rpc boom' } })
    await expect(
      fetchCardsInDeck({ deck_id: 10, sort_by: 'default', query: null, offset: 0, limit: 50 })
    ).rejects.toThrow('rpc boom')
  })

  test('passes offset through to p_offset for pagination', async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null })
    await fetchCardsInDeck({ deck_id: 3, sort_by: 'default', query: null, offset: 150, limit: 50 })
    expect(rpcMock).toHaveBeenCalledWith(
      'get_cards_in_deck',
      expect.objectContaining({ p_offset: 150, p_limit: 51 })
    )
  })
})
