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

function result(capabilities, grantedKeys = new Set()) {
  return { capabilities, grantedKeys }
}

beforeEach(() => {
  capabilitiesData.value = undefined
})

describe('useCapabilities().isLive', () => {
  test('returns the fallback unchanged while the capabilities query is unloaded', () => {
    capabilitiesData.value = undefined
    const { isLive } = useCapabilities()
    expect(isLive('audio_reader', false)).toBe(false)
    expect(isLive('audio_reader', true)).toBe(true)
  })

  test('returns the fallback unchanged when the capabilities read is offline (null data)', () => {
    capabilitiesData.value = null
    const { isLive } = useCapabilities()
    expect(isLive('audio_reader', true)).toBe(true)
    expect(isLive('audio_reader', false)).toBe(false)
  })

  test('state on is live for everyone, regardless of grantedKeys', () => {
    capabilitiesData.value = result([{ key: 'audio_reader', state: 'on' }])
    const { isLive } = useCapabilities()
    expect(isLive('audio_reader', false)).toBe(true)
  })

  test('state off is not live, ignoring the fallback', () => {
    capabilitiesData.value = result([{ key: 'audio_reader', state: 'off' }])
    const { isLive } = useCapabilities()
    expect(isLive('audio_reader', true)).toBe(false)
  })

  test('a missing row is not live, ignoring the fallback', () => {
    capabilitiesData.value = result([])
    const { isLive } = useCapabilities()
    expect(isLive('audio_reader', true)).toBe(false)
  })

  test('state targeted with the key in grantedKeys is live', () => {
    capabilitiesData.value = result(
      [{ key: 'audio_reader', state: 'targeted' }],
      new Set(['audio_reader'])
    )
    const { isLive } = useCapabilities()
    expect(isLive('audio_reader', false)).toBe(true)
  })

  test('state targeted with the key absent from grantedKeys is not live', () => {
    capabilitiesData.value = result([{ key: 'audio_reader', state: 'targeted' }], new Set())
    const { isLive } = useCapabilities()
    expect(isLive('audio_reader', true)).toBe(false)
  })

  test('re-derives after a refetch flips the row from off to on', () => {
    capabilitiesData.value = result([{ key: 'audio_reader', state: 'off' }])
    const { isLive } = useCapabilities()
    expect(isLive('audio_reader', false)).toBe(false)

    capabilitiesData.value = result([{ key: 'audio_reader', state: 'on' }])
    expect(isLive('audio_reader', false)).toBe(true)
  })
})
