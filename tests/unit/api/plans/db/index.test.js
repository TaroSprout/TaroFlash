import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  selectMock: vi.fn()
}))

vi.mock('@/supabase-client', () => ({
  supabase: {
    from: () => ({
      select: mocks.selectMock
    })
  }
}))

vi.mock('@/utils/logger', () => ({ default: { error: vi.fn() } }))

import { fetchPlanLimits } from '@/api/plans/db'

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mocks.selectMock.mockReset()
})

// ── fetchPlanLimits ───────────────────────────────────────────────────────────

describe('fetchPlanLimits', () => {
  test('selects id, deck_limit, cards_per_deck_limit from plans [obligation]', async () => {
    mocks.selectMock.mockResolvedValue({ data: [], error: null })
    await fetchPlanLimits()
    expect(mocks.selectMock).toHaveBeenCalledWith('id, deck_limit, cards_per_deck_limit')
  })

  test('returns the rows on success', async () => {
    const rows = [
      { id: 'free', deck_limit: 10, cards_per_deck_limit: 500 },
      { id: 'paid', deck_limit: null, cards_per_deck_limit: null }
    ]
    mocks.selectMock.mockResolvedValue({ data: rows, error: null })
    const result = await fetchPlanLimits()
    expect(result).toEqual(rows)
  })

  test('returns an empty array when data is null', async () => {
    mocks.selectMock.mockResolvedValue({ data: null, error: null })
    const result = await fetchPlanLimits()
    expect(result).toEqual([])
  })

  test('logs and throws on error', async () => {
    const err = { message: 'boom' }
    mocks.selectMock.mockResolvedValue({ data: null, error: err })
    await expect(fetchPlanLimits()).rejects.toBe(err)
  })
})
