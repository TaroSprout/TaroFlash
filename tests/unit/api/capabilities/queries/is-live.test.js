import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

let capabilitiesData

vi.mock('@/api/capabilities/queries/capabilities', async () => {
  const { ref } = await vi.importActual('vue')
  capabilitiesData = ref(undefined)
  return {
    useCapabilitiesQuery: () => ({ data: capabilitiesData })
  }
})

const { useCapabilities } = await import('@/api/capabilities/queries/is-live')

beforeEach(() => {
  capabilitiesData.value = undefined
})

describe('useCapabilities().isLive', () => {
  test('returns the fallback while the capabilities query is pending', () => {
    capabilitiesData.value = undefined
    const { isLive } = useCapabilities()
    expect(isLive('audio_reader', false)).toBe(false)
    expect(isLive('audio_reader', true)).toBe(true)
  })

  test('returns the fallback when the capabilities read is unreachable (no rows loaded)', () => {
    capabilitiesData.value = null
    const { isLive } = useCapabilities()
    expect(isLive('audio_reader', true)).toBe(true)
  })

  test('returns true once the loaded row is on', () => {
    capabilitiesData.value = [{ key: 'audio_reader', state: 'on' }]
    const { isLive } = useCapabilities()
    expect(isLive('audio_reader', false)).toBe(true)
  })

  test('returns false once the loaded row is off, ignoring the fallback', () => {
    capabilitiesData.value = [{ key: 'audio_reader', state: 'off' }]
    const { isLive } = useCapabilities()
    expect(isLive('audio_reader', true)).toBe(false)
  })

  test('returns false when no row matches the key, ignoring the fallback', () => {
    capabilitiesData.value = []
    const { isLive } = useCapabilities()
    expect(isLive('audio_reader', true)).toBe(false)
  })

  test('re-derives after a refetch flips the row from off to on', () => {
    capabilitiesData.value = [{ key: 'audio_reader', state: 'off' }]
    const { isLive } = useCapabilities()
    expect(isLive('audio_reader', false)).toBe(false)

    capabilitiesData.value = [{ key: 'audio_reader', state: 'on' }]
    expect(isLive('audio_reader', false)).toBe(true)
  })
})
