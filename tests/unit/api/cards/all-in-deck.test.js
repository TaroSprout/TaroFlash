import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { ref } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { useQuerySpy, fetchAllCardsInDeckMock } = vi.hoisted(() => ({
  useQuerySpy: vi.fn((cfg) => cfg),
  fetchAllCardsInDeckMock: vi.fn()
}))

vi.mock('@pinia/colada', () => ({ useQuery: useQuerySpy }))
vi.mock('@/api/cards/db', () => ({ fetchAllCardsInDeck: fetchAllCardsInDeckMock }))

// ── Imports ───────────────────────────────────────────────────────────────────

import { useAllCardsInDeckQuery } from '@/api/cards/queries/all-in-deck'

// ── Helpers ───────────────────────────────────────────────────────────────────

function configFrom(hook) {
  hook()
  return useQuerySpy.mock.calls.at(-1)[0]
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useAllCardsInDeckQuery', () => {
  beforeEach(() => {
    useQuerySpy.mockClear()
    fetchAllCardsInDeckMock.mockClear()
  })

  test('uses ["cards", deck_id, "all"] as the query key — nests under deck cards prefix', () => {
    const { key } = configFrom(() => useAllCardsInDeckQuery(10, ref(true)))
    expect(key()).toEqual(['cards', 10, 'all'])
  })

  test('query key is reactive — reflects current deck_id when given a getter', () => {
    const id_ref = ref(5)
    const { key } = configFrom(() => useAllCardsInDeckQuery(() => id_ref.value, ref(true)))
    expect(key()).toEqual(['cards', 5, 'all'])
    id_ref.value = 99
    expect(key()).toEqual(['cards', 99, 'all'])
  })

  test('calls fetchAllCardsInDeck with the deck_id when query runs', async () => {
    fetchAllCardsInDeckMock.mockResolvedValueOnce([])
    const { query } = configFrom(() => useAllCardsInDeckQuery(42, ref(true)))
    await query()
    expect(fetchAllCardsInDeckMock).toHaveBeenCalledWith(42)
  })

  test('enabled gate is false when given a false ref — full-deck fetch must not fire when sort is default [obligation]', () => {
    const enabled_ref = ref(false)
    const { enabled } = configFrom(() => useAllCardsInDeckQuery(1, enabled_ref))
    expect(enabled()).toBe(false)
  })

  test('enabled gate is true when given a true ref [obligation]', () => {
    const enabled_ref = ref(true)
    const { enabled } = configFrom(() => useAllCardsInDeckQuery(1, enabled_ref))
    expect(enabled()).toBe(true)
  })

  test('enabled gate reacts when the ref changes', () => {
    const enabled_ref = ref(false)
    const { enabled } = configFrom(() => useAllCardsInDeckQuery(1, enabled_ref))
    expect(enabled()).toBe(false)
    enabled_ref.value = true
    expect(enabled()).toBe(true)
  })

  test('enabled gate works with a getter function', () => {
    let active = false
    const { enabled } = configFrom(() => useAllCardsInDeckQuery(1, () => active))
    expect(enabled()).toBe(false)
    active = true
    expect(enabled()).toBe(true)
  })
})
