import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  single: vi.fn()
}))

vi.mock('@/supabase-client', () => ({
  supabase: {
    rpc: mocks.rpc
  }
}))

vi.mock('@/utils/logger', () => ({ default: { error: vi.fn() } }))

import { fetchSessionEarnings } from '@/api/rewards/db'
import logger from '@/utils/logger'

beforeEach(() => {
  mocks.rpc.mockReset()
  mocks.single.mockReset()
  mocks.rpc.mockReturnValue({ single: mocks.single })
})

describe('fetchSessionEarnings', () => {
  test('forwards the session id to the get_session_earnings RPC as p_session_id', async () => {
    mocks.single.mockResolvedValueOnce({ data: { base: 2, bonus: 1, balance: 10 }, error: null })

    await fetchSessionEarnings('session-1')

    expect(mocks.rpc).toHaveBeenCalledWith('get_session_earnings', { p_session_id: 'session-1' })
  })

  test('resolves with the row the RPC returns', async () => {
    mocks.single.mockResolvedValueOnce({ data: { base: 2, bonus: 1, balance: 10 }, error: null })

    await expect(fetchSessionEarnings('session-1')).resolves.toEqual({
      base: 2,
      bonus: 1,
      balance: 10
    })
  })

  test('logs and throws when the RPC errors', async () => {
    mocks.single.mockResolvedValueOnce({ data: null, error: { message: 'boom' } })

    await expect(fetchSessionEarnings('session-1')).rejects.toThrow('boom')
    expect(logger.error).toHaveBeenCalledWith('boom')
  })
})
