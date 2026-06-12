import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createApp, nextTick, ref } from 'vue'

const { collectionRef, mutateSpy } = vi.hoisted(() => ({
  collectionRef: { current: null },
  mutateSpy: vi.fn()
}))

vi.mock('@/api/lessons', () => ({
  useLessonCollectionQuery: () => ({ data: collectionRef.current }),
  useSetCollectionProgressMutation: () => ({ mutate: mutateSpy })
}))

const { useReaderProgress } = await import('@/composables/audio-reader/use-reader-progress')

// Run the composable inside a real app so watch() + onUnmounted fire.
function withSetup(setup) {
  let result
  const app = createApp({
    setup() {
      result = setup()
      return () => null
    }
  })
  app.mount(document.createElement('div'))
  return [result, app]
}

function makePlayer(overrides = {}) {
  return {
    loaded: ref(false),
    current_time: ref(0),
    duration: ref(120),
    is_playing: ref(false),
    seek: vi.fn(),
    ...overrides
  }
}

describe('useReaderProgress', () => {
  let app

  beforeEach(() => {
    collectionRef.current = ref(null)
    mutateSpy.mockClear()
  })

  afterEach(() => {
    app?.unmount()
  })

  describe('restore', () => {
    test('seeks to the stored offset and re-bookmarks when this chapter is the bookmark', async () => {
      collectionRef.current = ref({ id: 5, last_lesson_id: 2, last_position_seconds: 42 })
      const player = makePlayer()
      ;[, app] = withSetup(() => useReaderProgress(ref(5), ref(2), player))

      player.loaded.value = true
      await nextTick()

      expect(player.seek).toHaveBeenCalledWith(42)
      expect(mutateSpy).toHaveBeenCalledWith({
        collection_id: 5,
        lesson_id: 2,
        position_seconds: 42
      })
    })

    test('starts at 0 (no seek) when a different chapter holds the bookmark', async () => {
      collectionRef.current = ref({ id: 5, last_lesson_id: 99, last_position_seconds: 42 })
      const player = makePlayer()
      ;[, app] = withSetup(() => useReaderProgress(ref(5), ref(2), player))

      player.loaded.value = true
      await nextTick()

      expect(player.seek).not.toHaveBeenCalled()
      expect(mutateSpy).toHaveBeenCalledWith({
        collection_id: 5,
        lesson_id: 2,
        position_seconds: 0
      })
    })

    test('restarts the chapter when the stored offset is at the very end', async () => {
      collectionRef.current = ref({ id: 5, last_lesson_id: 2, last_position_seconds: 119 })
      const player = makePlayer({ duration: ref(120) })
      ;[, app] = withSetup(() => useReaderProgress(ref(5), ref(2), player))

      player.loaded.value = true
      await nextTick()

      expect(player.seek).not.toHaveBeenCalled()
      expect(mutateSpy).toHaveBeenCalledWith({
        collection_id: 5,
        lesson_id: 2,
        position_seconds: 0
      })
    })

    test('does not re-seek when the collection cache is patched under the same chapter', async () => {
      const data = ref({ id: 5, last_lesson_id: 2, last_position_seconds: 42 })
      collectionRef.current = data
      const player = makePlayer()
      ;[, app] = withSetup(() => useReaderProgress(ref(5), ref(2), player))

      player.loaded.value = true
      await nextTick()
      player.seek.mockClear()

      data.value = { id: 5, last_lesson_id: 2, last_position_seconds: 0 }
      await nextTick()

      expect(player.seek).not.toHaveBeenCalled()
    })
  })

  describe('save', () => {
    test('writes the position once playback advances a step', async () => {
      collectionRef.current = ref({ id: 5, last_lesson_id: 2, last_position_seconds: 0 })
      const player = makePlayer()
      ;[, app] = withSetup(() => useReaderProgress(ref(5), ref(2), player))

      player.loaded.value = true
      await nextTick()
      mutateSpy.mockClear()
      player.is_playing.value = true

      player.current_time.value = 4
      await nextTick()
      expect(mutateSpy).not.toHaveBeenCalled()

      player.current_time.value = 6
      await nextTick()
      expect(mutateSpy).toHaveBeenCalledWith({
        collection_id: 5,
        lesson_id: 2,
        position_seconds: 6
      })
    })

    test('flushes the exact spot when playback pauses', async () => {
      collectionRef.current = ref({ id: 5, last_lesson_id: 2, last_position_seconds: 0 })
      const player = makePlayer()
      ;[, app] = withSetup(() => useReaderProgress(ref(5), ref(2), player))

      player.loaded.value = true
      player.is_playing.value = true
      await nextTick()
      mutateSpy.mockClear()

      player.current_time.value = 3.5
      player.is_playing.value = false
      await nextTick()

      expect(mutateSpy).toHaveBeenCalledWith({
        collection_id: 5,
        lesson_id: 2,
        position_seconds: 3.5
      })
    })

    test('saves on unmount so leaving the reader keeps the spot', async () => {
      collectionRef.current = ref({ id: 5, last_lesson_id: 2, last_position_seconds: 0 })
      const player = makePlayer()
      let localApp
      ;[, localApp] = withSetup(() => useReaderProgress(ref(5), ref(2), player))

      player.loaded.value = true
      await nextTick()
      player.current_time.value = 12
      mutateSpy.mockClear()

      localApp.unmount()

      expect(mutateSpy).toHaveBeenCalledWith({
        collection_id: 5,
        lesson_id: 2,
        position_seconds: 12
      })
    })
  })
})
