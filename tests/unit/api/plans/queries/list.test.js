import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { useQuerySpy, fetchPlanLimitsMock } = vi.hoisted(() => ({
  useQuerySpy: vi.fn(),
  fetchPlanLimitsMock: vi.fn()
}))

vi.mock('@pinia/colada', () => ({
  useQuery: useQuerySpy
}))

vi.mock('@/api/plans/db', () => ({
  fetchPlanLimits: fetchPlanLimitsMock
}))

import { usePlanLimitsQuery } from '@/api/plans/queries/list'

beforeEach(() => {
  useQuerySpy.mockReset()
})

describe('usePlanLimitsQuery', () => {
  test('calls useQuery with the shared ["plans"] key and fetchPlanLimits', () => {
    useQuerySpy.mockReturnValue({ data: { value: [] } })

    usePlanLimitsQuery()

    expect(useQuerySpy).toHaveBeenCalledWith({
      key: ['plans'],
      query: fetchPlanLimitsMock
    })
  })

  test('returns whatever useQuery returns', () => {
    const result = { data: { value: [{ id: 'free' }] } }
    useQuerySpy.mockReturnValue(result)

    expect(usePlanLimitsQuery()).toBe(result)
  })
})
