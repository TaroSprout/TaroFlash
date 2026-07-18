import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { useQuerySpy, fetchSessionBootstrapMock } = vi.hoisted(() => ({
  useQuerySpy: vi.fn((cfg) => cfg),
  fetchSessionBootstrapMock: vi.fn()
}))

vi.mock('@pinia/colada', () => ({
  useQuery: useQuerySpy
}))

vi.mock('@/api/cards/db', () => ({
  fetchSessionBootstrap: fetchSessionBootstrapMock
}))

import { useSessionBootstrapQuery } from '@/api/cards/queries/session-bootstrap'

beforeEach(() => {
  useQuerySpy.mockClear()
  fetchSessionBootstrapMock.mockClear()
})

function configFrom(hook) {
  hook()
  return useQuerySpy.mock.calls.at(-1)[0]
}

describe('useSessionBootstrapQuery', () => {
  test('uses ["cards", "session-bootstrap", deck_ids] as its key', () => {
    const { key } = configFrom(() => useSessionBootstrapQuery(() => [1, 2]))
    expect(key()).toEqual(['cards', 'session-bootstrap', [1, 2]])
  })

  test('accepts a plain array (not just a getter) via toValue', () => {
    const { key } = configFrom(() => useSessionBootstrapQuery([5]))
    expect(key()).toEqual(['cards', 'session-bootstrap', [5]])
  })

  test('query calls fetchSessionBootstrap with the resolved deck_ids', async () => {
    fetchSessionBootstrapMock.mockResolvedValueOnce({ decks: [], cards: [] })
    const { query } = configFrom(() => useSessionBootstrapQuery(() => [1, 2, 3]))

    await query()

    expect(fetchSessionBootstrapMock).toHaveBeenCalledWith([1, 2, 3])
  })

  test('enabled resolves to false — auto-fetch is off, the bootstrap runs manually via refetch() [obligation]', () => {
    const { enabled } = configFrom(() => useSessionBootstrapQuery(() => [1]))
    expect(enabled()).toBe(false)
  })
})
