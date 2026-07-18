import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { rpcMock, loggerMock, localDayStartMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  loggerMock: { error: vi.fn(), info: vi.fn() },
  localDayStartMock: vi.fn(() => '2026-07-17T00:00:00.000Z')
}))

vi.mock('@/supabase-client', () => ({
  supabase: { rpc: rpcMock }
}))

vi.mock('@/utils/logger', () => ({ default: loggerMock }))

vi.mock('@/utils/date', () => ({
  localDayStart: localDayStartMock
}))

import { fetchSessionBootstrap } from '@/api/cards/db/session-bootstrap'

beforeEach(() => {
  rpcMock.mockReset()
  loggerMock.error.mockClear()
  localDayStartMock.mockClear()
})

describe('fetchSessionBootstrap', () => {
  test('calls get_session_decks_and_cards with p_deck_ids and p_today_start', async () => {
    rpcMock.mockResolvedValueOnce({ data: { decks: [], cards: [] }, error: null })

    await fetchSessionBootstrap([1, 2, 3])

    expect(rpcMock).toHaveBeenCalledWith('get_session_decks_and_cards', {
      p_deck_ids: [1, 2, 3],
      p_today_start: '2026-07-17T00:00:00.000Z'
    })
  })

  test('returns the { decks, cards } shape from the RPC data', async () => {
    const decks = [{ id: 1, title: 'Deck' }]
    const cards = [{ id: 10, deck_id: 1 }]
    rpcMock.mockResolvedValueOnce({ data: { decks, cards }, error: null })

    const result = await fetchSessionBootstrap([1])

    expect(result).toEqual({ decks, cards })
  })

  test('returns an empty { decks: [], cards: [] } shape when data is null [obligation]', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null })

    const result = await fetchSessionBootstrap([1])

    expect(result).toEqual({ decks: [], cards: [] })
  })

  test('logs and throws when the RPC returns an error [obligation]', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'boom' } })

    await expect(fetchSessionBootstrap([1])).rejects.toThrow('boom')
    expect(loggerMock.error).toHaveBeenCalledWith('boom')
  })

  test('passes an empty deck_ids array straight through to the RPC', async () => {
    rpcMock.mockResolvedValueOnce({ data: { decks: [], cards: [] }, error: null })

    await fetchSessionBootstrap([])

    expect(rpcMock).toHaveBeenCalledWith(
      'get_session_decks_and_cards',
      expect.objectContaining({ p_deck_ids: [] })
    )
  })
})
