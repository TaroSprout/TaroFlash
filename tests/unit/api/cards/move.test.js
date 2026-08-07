import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { updateMock, eqMock, fromMock } = vi.hoisted(() => {
  const eqMock = vi.fn()
  const updateMock = vi.fn(() => ({ eq: eqMock }))
  const fromMock = vi.fn(() => ({ update: updateMock }))
  return { updateMock, eqMock, fromMock }
})

vi.mock('@/supabase-client', () => ({
  supabase: { from: fromMock }
}))

vi.mock('@/utils/logger', () => ({ default: { error: vi.fn() } }))

import { moveCard } from '@/api/cards/db/move'

describe('moveCard', () => {
  beforeEach(() => {
    fromMock.mockClear()
    updateMock.mockClear()
    eqMock.mockReset()
  })

  test('writes the new rank as a plain update, no RPC', async () => {
    eqMock.mockResolvedValueOnce({ error: null })

    await moveCard({ card_id: 42, rank: 'a5' })

    expect(fromMock).toHaveBeenCalledWith('cards')
    expect(updateMock).toHaveBeenCalledWith({ rank: 'a5' })
    expect(eqMock).toHaveBeenCalledWith('id', 42)
  })

  test('resolves with no return value on success', async () => {
    eqMock.mockResolvedValueOnce({ error: null })
    const result = await moveCard({ card_id: 1, rank: 'a1' })
    expect(result).toBeUndefined()
  })

  test('throws when the update errors', async () => {
    const err = new Error('not authorized')
    eqMock.mockResolvedValueOnce({ error: err })
    await expect(moveCard({ card_id: 1, rank: 'a1' })).rejects.toBe(err)
  })
})
