import { describe, test, expect, beforeEach, afterEach, vi } from 'vite-plus/test'
import { nextTick } from 'vue'

// Module-level state is seeded from localStorage at import time, so each test
// gets a fresh module instance rather than sharing the one singleton.
beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

afterEach(() => {
  localStorage.clear()
})

describe('useReaderPrefs', () => {
  test('defaults playback_rate to 1, paragraph_density to medium', async () => {
    const { useReaderPrefs } = await import('@/views/reader/composables/reader-prefs')
    const { playback_rate, paragraph_density } = useReaderPrefs()

    expect(playback_rate.value).toBe(1)
    expect(paragraph_density.value).toBe('medium')
  })

  test('rehydrates each key from its own localStorage slot', async () => {
    localStorage.setItem('audio-reader.playbackRate', JSON.stringify(1.5))
    localStorage.setItem('audio-reader.paragraphDensity', JSON.stringify('short'))

    const { useReaderPrefs } = await import('@/views/reader/composables/reader-prefs')
    const { playback_rate, paragraph_density } = useReaderPrefs()

    expect(playback_rate.value).toBe(1.5)
    expect(paragraph_density.value).toBe('short')
  })

  test('writing paragraph_density persists it under its own key without touching the others', async () => {
    const { useReaderPrefs } = await import('@/views/reader/composables/reader-prefs')
    const { paragraph_density } = useReaderPrefs()

    paragraph_density.value = 'long'
    await nextTick()

    expect(localStorage.getItem('audio-reader.paragraphDensity')).toBe(JSON.stringify('long'))
    expect(localStorage.getItem('audio-reader.playbackRate')).toBe(null)
  })

  test('every call returns the same singleton refs', async () => {
    const { useReaderPrefs } = await import('@/views/reader/composables/reader-prefs')
    const first = useReaderPrefs()
    const second = useReaderPrefs()

    first.paragraph_density.value = 'long'

    expect(second.paragraph_density.value).toBe('long')
    expect(first.paragraph_density).toBe(second.paragraph_density)
  })

  test('writing playback_rate persists it under its own key', async () => {
    const { useReaderPrefs } = await import('@/views/reader/composables/reader-prefs')
    const { playback_rate } = useReaderPrefs()

    playback_rate.value = 2
    await nextTick()

    expect(localStorage.getItem('audio-reader.playbackRate')).toBe(JSON.stringify(2))
  })
})
