import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { ref } from 'vue'

const { useQuerySpy, fetchCapabilityGrantsMock } = vi.hoisted(() => ({
  useQuerySpy: vi.fn((cfg) => cfg),
  fetchCapabilityGrantsMock: vi.fn()
}))

vi.mock('@pinia/colada', () => ({
  useQuery: useQuerySpy
}))

vi.mock('@/api/capabilities/db', () => ({
  fetchCapabilityGrants: fetchCapabilityGrantsMock
}))

import { useCapabilityGrantsQuery } from '@/api/capabilities/queries/capability-grants'

beforeEach(() => {
  useQuerySpy.mockClear()
  fetchCapabilityGrantsMock.mockClear()
})

describe('useCapabilityGrantsQuery', () => {
  test('keys off the capability key', () => {
    useCapabilityGrantsQuery('audio_reader')
    const config = useQuerySpy.mock.calls[0][0]
    expect(config.key()).toEqual(['capability-grants', 'audio_reader'])
  })

  test('resolves a ref key at call time', () => {
    const key = ref('audio_reader')
    useCapabilityGrantsQuery(key)
    const config = useQuerySpy.mock.calls[0][0]

    key.value = 'other_capability'

    expect(config.key()).toEqual(['capability-grants', 'other_capability'])
  })

  test('queries through fetchCapabilityGrants with the resolved key', () => {
    useCapabilityGrantsQuery('audio_reader')
    const config = useQuerySpy.mock.calls[0][0]

    config.query()

    expect(fetchCapabilityGrantsMock).toHaveBeenCalledWith('audio_reader')
  })
})
