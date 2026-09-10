import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

let switchesData

vi.mock('@/api/capabilities/queries/capabilities', async () => {
  const { ref } = await vi.importActual('vue')
  switchesData = ref(undefined)
  return {
    useCapabilitiesQuery: () => ({ data: switchesData })
  }
})

const { useCapabilities } = await import('@/api/capabilities/queries/is-live')

beforeEach(() => {
  switchesData.value = undefined
})

describe('useCapabilities().isLive', () => {
  test('returns the fallback while the switches query is pending', () => {
    switchesData.value = undefined
    const { isLive } = useCapabilities()
    expect(isLive('audio_reader', false)).toBe(false)
    expect(isLive('audio_reader', true)).toBe(true)
  })

  test('returns the fallback when the switches read is unreachable (no rows loaded)', () => {
    switchesData.value = null
    const { isLive } = useCapabilities()
    expect(isLive('audio_reader', true)).toBe(true)
  })

  test('returns true once the loaded row is on', () => {
    switchesData.value = [{ key: 'audio_reader', state: 'on' }]
    const { isLive } = useCapabilities()
    expect(isLive('audio_reader', false)).toBe(true)
  })

  test('returns false once the loaded row is off, ignoring the fallback', () => {
    switchesData.value = [{ key: 'audio_reader', state: 'off' }]
    const { isLive } = useCapabilities()
    expect(isLive('audio_reader', true)).toBe(false)
  })

  test('returns false when no row matches the key, ignoring the fallback', () => {
    switchesData.value = []
    const { isLive } = useCapabilities()
    expect(isLive('audio_reader', true)).toBe(false)
  })

  test('re-derives after a refetch flips the row from off to on', () => {
    switchesData.value = [{ key: 'audio_reader', state: 'off' }]
    const { isLive } = useCapabilities()
    expect(isLive('audio_reader', false)).toBe(false)

    switchesData.value = [{ key: 'audio_reader', state: 'on' }]
    expect(isLive('audio_reader', false)).toBe(true)
  })
})
