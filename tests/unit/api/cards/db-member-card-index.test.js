import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { rpcMock, memberStoreMock, loggerMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  memberStoreMock: { id: 'user-abc' },
  loggerMock: { error: vi.fn(), info: vi.fn() }
}))

vi.mock('@/supabase-client', () => ({
  supabase: { rpc: rpcMock }
}))

vi.mock('@/stores/member', () => ({
  useMemberStore: () => memberStoreMock
}))

vi.mock('@/utils/logger', () => ({ default: loggerMock }))

import { fetchMemberCardIndex } from '@/api/cards/db/member-card-index'

beforeEach(() => {
  rpcMock.mockReset()
  loggerMock.error.mockClear()
  loggerMock.info.mockClear()
})

describe('fetchMemberCardIndex', () => {
  test('calls get_member_card_index RPC with the member id', async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null })

    await fetchMemberCardIndex()

    expect(rpcMock).toHaveBeenCalledWith('get_member_card_index', {
      p_member_id: 'user-abc'
    })
  })

  test('returns the RPC data array', async () => {
    const entries = [
      { term: 'cat', deck_ids: [1] },
      { term: 'dog', deck_ids: [2, 3] }
    ]
    rpcMock.mockResolvedValueOnce({ data: entries, error: null })

    const result = await fetchMemberCardIndex()

    expect(result).toEqual(entries)
  })

  test('returns [] when the RPC returns null data', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null })

    const result = await fetchMemberCardIndex()

    expect(result).toEqual([])
  })

  test('throws and logs when the RPC returns an error', async () => {
    const err = { message: 'permission denied' }
    rpcMock.mockResolvedValueOnce({ data: null, error: err })

    await expect(fetchMemberCardIndex()).rejects.toThrow('permission denied')
    expect(loggerMock.error).toHaveBeenCalledWith('permission denied')
  })

  test('logs the term count and payload size after a successful fetch', async () => {
    const entries = [{ term: 'cat', deck_ids: [1] }]
    rpcMock.mockResolvedValueOnce({ data: entries, error: null })

    await fetchMemberCardIndex()

    expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('[card-index]'))
    expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('1 terms'))
  })
})
