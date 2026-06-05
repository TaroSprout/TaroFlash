import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { ref, nextTick } from 'vue'
import { createApp } from 'vue'

// Stub rAF/cAF so tick() doesn't spin in jsdom
let rafCallback = null
vi.stubGlobal(
  'requestAnimationFrame',
  vi.fn((cb) => {
    rafCallback = cb
    return 1
  })
)
vi.stubGlobal('cancelAnimationFrame', vi.fn())

const { useAudioPlayer } = await import('@/composables/audio-reader/use-audio-player')

// Helper: run the composable inside a real Vue app so watch() + onUnmounted work
function withSetup(composable) {
  let result
  const app = createApp({
    setup() {
      result = composable()
      return () => null
    }
  })
  app.mount(document.createElement('div'))
  return [result, app]
}

// Helper: create a minimal fake HTMLAudioElement
function makeAudioEl() {
  const handlers = {}
  return {
    currentTime: 0,
    duration: 120,
    readyState: 0, // HAVE_NOTHING — won't trigger onLoaded on bind
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    addEventListener: vi.fn((event, cb) => {
      handlers[event] = cb
    }),
    removeEventListener: vi.fn((event) => {
      delete handlers[event]
    }),
    _emit(event) {
      handlers[event]?.()
    }
  }
}

describe('useAudioPlayer', () => {
  let app

  afterEach(() => {
    app?.unmount()
    rafCallback = null
    requestAnimationFrame.mockClear()
    cancelAnimationFrame.mockClear()
  })

  describe('initial state', () => {
    test('current_time starts at 0', () => {
      const target = ref(null)
      ;[, app] = withSetup(() => useAudioPlayer(target))
      const [result] = withSetup(() => useAudioPlayer(ref(null)))
      expect(result.current_time.value).toBe(0)
    })

    test('is_playing starts as false', () => {
      const [result, a] = withSetup(() => useAudioPlayer(ref(null)))
      app = a
      expect(result.is_playing.value).toBe(false)
    })

    test('duration starts at 0', () => {
      const [result, a] = withSetup(() => useAudioPlayer(ref(null)))
      app = a
      expect(result.duration.value).toBe(0)
    })
  })

  describe('binding to an audio element', () => {
    test('attaches event listeners when target ref is set', async () => {
      const target = ref(null)
      const [, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      target.value = el
      await nextTick()

      expect(el.addEventListener).toHaveBeenCalledWith('loadedmetadata', expect.any(Function))
      expect(el.addEventListener).toHaveBeenCalledWith('play', expect.any(Function))
      expect(el.addEventListener).toHaveBeenCalledWith('pause', expect.any(Function))
      expect(el.addEventListener).toHaveBeenCalledWith('ended', expect.any(Function))
      expect(el.addEventListener).toHaveBeenCalledWith('timeupdate', expect.any(Function))
    })

    test('removes event listeners when target ref becomes null', async () => {
      const target = ref(null)
      const [, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      target.value = el
      await nextTick()

      target.value = null
      await nextTick()

      expect(el.removeEventListener).toHaveBeenCalledWith('loadedmetadata', expect.any(Function))
      expect(el.removeEventListener).toHaveBeenCalledWith('play', expect.any(Function))
      expect(el.removeEventListener).toHaveBeenCalledWith('pause', expect.any(Function))
      expect(el.removeEventListener).toHaveBeenCalledWith('ended', expect.any(Function))
      expect(el.removeEventListener).toHaveBeenCalledWith('timeupdate', expect.any(Function))
    })

    test('removes event listeners on unmount', async () => {
      const target = ref(null)
      const [, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      target.value = el
      await nextTick()

      a.unmount()
      app = null

      expect(el.removeEventListener).toHaveBeenCalledWith('play', expect.any(Function))
    })

    test('reads duration from element when readyState >= 1 on bind', async () => {
      const target = ref(null)
      const [result, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      el.readyState = 1
      el.duration = 180
      target.value = el
      await nextTick()

      expect(result.duration.value).toBe(180)
    })
  })

  describe('play and pause events', () => {
    test('sets is_playing to true when play event fires', async () => {
      const target = ref(null)
      const [result, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      target.value = el
      await nextTick()

      el._emit('play')
      expect(result.is_playing.value).toBe(true)
    })

    test('sets is_playing to false when pause event fires', async () => {
      const target = ref(null)
      const [result, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      target.value = el
      await nextTick()

      el._emit('play')
      el._emit('pause')
      expect(result.is_playing.value).toBe(false)
    })

    test('sets is_playing to false when ended event fires', async () => {
      const target = ref(null)
      const [result, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      target.value = el
      await nextTick()

      el._emit('play')
      el._emit('ended')
      expect(result.is_playing.value).toBe(false)
    })

    test('starts rAF loop when play fires', async () => {
      const target = ref(null)
      const [, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      target.value = el
      await nextTick()

      requestAnimationFrame.mockClear()
      el._emit('play')

      expect(requestAnimationFrame).toHaveBeenCalled()
    })

    test('cancels rAF loop when pause fires', async () => {
      const target = ref(null)
      const [, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      target.value = el
      await nextTick()

      el._emit('play')
      cancelAnimationFrame.mockClear()
      el._emit('pause')

      expect(cancelAnimationFrame).toHaveBeenCalled()
    })
  })

  describe('seek()', () => {
    test('sets el.currentTime to the given seconds', async () => {
      const target = ref(null)
      const [result, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      target.value = el
      await nextTick()

      result.seek(42)
      expect(el.currentTime).toBe(42)
    })

    test('updates current_time immediately without waiting for timeupdate', async () => {
      const target = ref(null)
      const [result, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      target.value = el
      await nextTick()

      result.seek(55)
      expect(result.current_time.value).toBe(55)
    })

    test('is a no-op when no element is bound', () => {
      const [result, a] = withSetup(() => useAudioPlayer(ref(null)))
      app = a
      // Must not throw
      result.seek(10)
      expect(result.current_time.value).toBe(0)
    })
  })

  describe('play() and pause() call-through', () => {
    test('play() calls el.play()', async () => {
      const target = ref(null)
      const [result, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      target.value = el
      await nextTick()

      result.play()
      expect(el.play).toHaveBeenCalled()
    })

    test('pause() calls el.pause()', async () => {
      const target = ref(null)
      const [result, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      target.value = el
      await nextTick()

      result.pause()
      expect(el.pause).toHaveBeenCalled()
    })

    test('play() is a no-op when no element is bound', () => {
      const [result, a] = withSetup(() => useAudioPlayer(ref(null)))
      app = a
      // Must not throw
      result.play()
    })

    test('pause() is a no-op when no element is bound', () => {
      const [result, a] = withSetup(() => useAudioPlayer(ref(null)))
      app = a
      // Must not throw
      result.pause()
    })
  })

  describe('timeupdate event', () => {
    test('updates current_time from el.currentTime while paused', async () => {
      const target = ref(null)
      const [result, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      target.value = el
      await nextTick()

      el.currentTime = 30
      el._emit('timeupdate')
      expect(result.current_time.value).toBe(30)
    })

    test('does NOT update current_time from timeupdate while playing (rAF handles it)', async () => {
      const target = ref(null)
      const [result, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      target.value = el
      await nextTick()

      el._emit('play') // is_playing = true
      result.seek(0) // reset current_time to 0
      el.currentTime = 99
      el._emit('timeupdate')
      // timeupdate is ignored while playing; current_time stays 0
      expect(result.current_time.value).toBe(0)
    })
  })
})
