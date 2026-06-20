import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  selectMock: vi.fn(),
  eqMock: vi.fn(),
  singleMock: vi.fn(),
  upsertMock: vi.fn()
}))

vi.mock('@/supabase-client', () => ({
  supabase: {
    from: () => ({
      select: mocks.selectMock,
      upsert: mocks.upsertMock
    })
  }
}))

vi.mock('@/utils/logger', () => ({ default: { error: vi.fn() } }))

import { fetchMemberById, upsertMember } from '@/api/members/db'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeChain(result) {
  const single = vi.fn().mockResolvedValue(result)
  const eq = vi.fn().mockReturnValue({ single })
  mocks.selectMock.mockReturnValue({ eq })
  return { eq, single }
}

const baseMemberRow = {
  id: 'user-1',
  display_name: 'Alice',
  email: 'alice@test.com',
  plan: 'paid',
  role: 'member',
  created_at: '2025-01-01',
  updated_at: '2025-01-02',
  avatar_url: null,
  description: null,
  preferences: null
}

beforeEach(() => {
  mocks.selectMock.mockReset()
  mocks.upsertMock.mockReset()
})

// ── fetchMemberById ───────────────────────────────────────────────────────────

describe('fetchMemberById', () => {
  test('selects with plans(display_name) embed [obligation]', async () => {
    makeChain({ data: { ...baseMemberRow, plans: { display_name: 'Builder' } }, error: null })
    await fetchMemberById('user-1')
    expect(mocks.selectMock).toHaveBeenCalledWith('*, plans(display_name)')
  })

  test('flattens plans.display_name to plan_display_name on the result [obligation]', async () => {
    makeChain({ data: { ...baseMemberRow, plans: { display_name: 'Builder' } }, error: null })
    const result = await fetchMemberById('user-1')
    expect(result).toHaveProperty('plan_display_name', 'Builder')
  })

  test('returned object has no nested plans property [obligation]', async () => {
    makeChain({ data: { ...baseMemberRow, plans: { display_name: 'Builder' } }, error: null })
    const result = await fetchMemberById('user-1')
    expect(result).not.toHaveProperty('plans')
  })

  test('handles null plans (free member without plan join) gracefully', async () => {
    makeChain({ data: { ...baseMemberRow, plans: null }, error: null })
    const result = await fetchMemberById('user-1')
    expect(result).toHaveProperty('plan_display_name', undefined)
    expect(result).not.toHaveProperty('plans')
  })

  test('returns null on error', async () => {
    makeChain({ data: null, error: { message: 'not found' } })
    const result = await fetchMemberById('user-1')
    expect(result).toBeNull()
  })
})

// ── upsertMember ──────────────────────────────────────────────────────────────

describe('upsertMember', () => {
  test('calls upsert with the member payload', async () => {
    mocks.upsertMock.mockResolvedValue({ error: null })
    await upsertMember(baseMemberRow)
    expect(mocks.upsertMock).toHaveBeenCalledWith(baseMemberRow, { onConflict: 'id' })
  })

  test('throws when upsert returns an error', async () => {
    const err = { message: 'constraint violation' }
    mocks.upsertMock.mockResolvedValue({ error: err })
    await expect(upsertMember(baseMemberRow)).rejects.toBe(err)
  })
})
