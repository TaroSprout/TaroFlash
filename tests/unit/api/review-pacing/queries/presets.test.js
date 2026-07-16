import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { useQuerySpy, fetchPresetsMock } = vi.hoisted(() => ({
  useQuerySpy: vi.fn((cfg) => cfg),
  fetchPresetsMock: vi.fn()
}))

vi.mock('@pinia/colada', () => ({ useQuery: useQuerySpy }))

vi.mock('@/api/review-pacing/db', () => ({ fetchPresets: fetchPresetsMock }))

import { usePresetsQuery } from '@/api/review-pacing/queries/presets'

beforeEach(() => {
  useQuerySpy.mockClear()
})

function config() {
  usePresetsQuery()
  return useQuerySpy.mock.calls.at(-1)[0]
}

describe('usePresetsQuery', () => {
  test('uses the ["review-pacing-presets"] key — mutations invalidate by this exact prefix', () => {
    const { key } = config()
    expect(key).toEqual(['review-pacing-presets'])
  })

  test('delegates to fetchPresets', () => {
    const { query } = config()
    expect(query).toBe(fetchPresetsMock)
  })
})
