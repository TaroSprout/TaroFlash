import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  selectMock: vi.fn(),
  eqMock: vi.fn(),
  singleMock: vi.fn(),
  updateMock: vi.fn(),
  updateEqMock: vi.fn()
}))

vi.mock('@/supabase-client', () => ({
  supabase: {
    from: () => ({
      select: mocks.selectMock,
      update: mocks.updateMock
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
  mocks.updateMock.mockReset()
  mocks.updateEqMock.mockReset()
  mocks.updateMock.mockReturnValue({ eq: mocks.updateEqMock })
})

// ── fetchMemberById ───────────────────────────────────────────────────────────

describe('fetchMemberById', () => {
  test('selects the explicit member column list, including the plans(deck_limit, cards_per_deck_limit) embed [obligation]', async () => {
    makeChain({ data: baseMemberRow, error: null })
    await fetchMemberById('user-1')
    expect(mocks.selectMock).toHaveBeenCalledWith(
      'id, display_name, description, created_at, email, avatar_url, role, plan, preferences, cover_config, plans(deck_limit, cards_per_deck_limit)'
    )
  })

  test('select does not include stripe_customer_id, stripe_subscription_id, or updated_at [obligation]', async () => {
    makeChain({ data: baseMemberRow, error: null })
    await fetchMemberById('user-1')
    const [columns] = mocks.selectMock.mock.calls[0]
    expect(columns).not.toMatch(/stripe_customer_id|stripe_subscription_id|updated_at/)
  })

  test('returns the row as-is, with no plan_display_name projection', async () => {
    makeChain({ data: baseMemberRow, error: null })
    const result = await fetchMemberById('user-1')
    expect(result).toEqual(baseMemberRow)
    expect(result).not.toHaveProperty('plan_display_name')
  })

  test('scopes the query by id via .eq("id", id)', async () => {
    const { eq } = makeChain({ data: baseMemberRow, error: null })
    await fetchMemberById('user-1')
    expect(eq).toHaveBeenCalledWith('id', 'user-1')
  })

  test('rethrows the supabase error instead of swallowing it [obligation]', async () => {
    const err = { message: 'not found' }
    makeChain({ data: null, error: err })
    await expect(fetchMemberById('user-1')).rejects.toBe(err)
  })
})

// ── upsertMember ──────────────────────────────────────────────────────────────

describe('upsertMember', () => {
  test('calls update with the payload (id omitted from the SET) scoped by .eq("id", id) [obligation]', async () => {
    mocks.updateEqMock.mockResolvedValue({ error: null })
    await upsertMember(baseMemberRow)

    const { id, ...updates } = baseMemberRow
    expect(mocks.updateMock).toHaveBeenCalledWith(updates)
    expect(mocks.updateMock.mock.calls[0][0]).not.toHaveProperty('id')
    expect(mocks.updateEqMock).toHaveBeenCalledWith('id', id)
  })

  test('never calls .upsert() — a partial payload would violate NOT NULL constraints [obligation]', async () => {
    mocks.updateEqMock.mockResolvedValue({ error: null })
    await upsertMember({ id: 'user-1', preferences: { study: { show_all_ratings: true } } })

    expect(mocks.updateMock).toHaveBeenCalledWith({
      preferences: { study: { show_all_ratings: true } }
    })
    expect(mocks.updateEqMock).toHaveBeenCalledWith('id', 'user-1')
  })

  test('throws when update returns an error', async () => {
    const err = { message: 'constraint violation' }
    mocks.updateEqMock.mockResolvedValue({ error: err })
    await expect(upsertMember(baseMemberRow)).rejects.toBe(err)
  })
})
