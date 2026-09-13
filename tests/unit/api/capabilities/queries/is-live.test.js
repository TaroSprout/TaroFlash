import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

let resolvedData

vi.mock('@/api/capabilities/queries/resolved', async () => {
  const { ref } = await vi.importActual('vue')
  resolvedData = ref(undefined)
  return {
    useResolvedCapabilitiesQuery: () => ({ data: resolvedData })
  }
})

const { useCapabilities } = await import('@/api/capabilities/queries/is-live')

beforeEach(() => {
  resolvedData.value = undefined
})

describe('useCapabilities().isLive', () => {
  test('returns the fallback unchanged while the resolved query is unloaded', () => {
    resolvedData.value = undefined
    const { isLive } = useCapabilities()
    expect(isLive('audio_reader', false)).toBe(false)
    expect(isLive('audio_reader', true)).toBe(true)
  })

  test('a loaded row that resolves live true reads live', () => {
    resolvedData.value = [{ key: 'audio_reader', live: true }]
    const { isLive } = useCapabilities()
    expect(isLive('audio_reader', false)).toBe(true)
  })

  test('a loaded row that resolves live false reads not-live, ignoring the fallback', () => {
    resolvedData.value = [{ key: 'audio_reader', live: false }]
    const { isLive } = useCapabilities()
    expect(isLive('audio_reader', true)).toBe(false)
  })

  test('a key absent from the resolved set reads not-live, ignoring the fallback', () => {
    resolvedData.value = [{ key: 'other_capability', live: true }]
    const { isLive } = useCapabilities()
    expect(isLive('audio_reader', true)).toBe(false)
  })

  test('re-derives after a refetch flips the row from not-live to live', () => {
    resolvedData.value = [{ key: 'audio_reader', live: false }]
    const { isLive } = useCapabilities()
    expect(isLive('audio_reader', false)).toBe(false)

    resolvedData.value = [{ key: 'audio_reader', live: true }]
    expect(isLive('audio_reader', false)).toBe(true)
  })
})
