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

const { mockNotice } = vi.hoisted(() => ({
  mockNotice: { error: vi.fn(), success: vi.fn(), warn: vi.fn() }
}))

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }))
vi.mock('@/stores/notice-store', () => ({ useNoticeStore: () => mockNotice }))

const { useAudioPlayer } = await import('@/composables/audio-reader/audio-player')

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
    playbackRate: 1,
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

  beforeEach(() => {
    mockNotice.error.mockReset()
  })

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

    test('loaded starts as false [obligation]', () => {
      const [result, a] = withSetup(() => useAudioPlayer(ref(null)))
      app = a
      expect(result.loaded.value).toBe(false)
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

    test('loaded becomes true when loadedmetadata event fires [obligation]', async () => {
      const target = ref(null)
      const [result, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      target.value = el
      await nextTick()

      expect(result.loaded.value).toBe(false)
      el._emit('loadedmetadata')
      expect(result.loaded.value).toBe(true)
    })

    test('loaded returns to false and duration resets to 0 on emptied event (src swap) [obligation]', async () => {
      const target = ref(null)
      const [result, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      el.readyState = 1
      el.duration = 120
      target.value = el
      await nextTick()
      // loadedmetadata fired on bind because readyState >= 1
      expect(result.loaded.value).toBe(true)
      expect(result.duration.value).toBe(120)

      el._emit('emptied')
      expect(result.loaded.value).toBe(false)
      expect(result.duration.value).toBe(0)
    })

    test('loaded returns to false on unbind (target ref becomes null) [obligation]', async () => {
      const target = ref(null)
      const [result, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      el.readyState = 1
      target.value = el
      await nextTick()
      expect(result.loaded.value).toBe(true)

      target.value = null
      await nextTick()
      expect(result.loaded.value).toBe(false)
    })

    test('loaded returns to false on unmount [obligation]', async () => {
      const target = ref(null)
      const [result, a] = withSetup(() => useAudioPlayer(target))

      const el = makeAudioEl()
      el.readyState = 1
      target.value = el
      await nextTick()
      expect(result.loaded.value).toBe(true)

      a.unmount()
      expect(result.loaded.value).toBe(false)
    })

    test('attaches emptied event listener when element is bound [obligation]', async () => {
      const target = ref(null)
      const [, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      target.value = el
      await nextTick()

      expect(el.addEventListener).toHaveBeenCalledWith('emptied', expect.any(Function))
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

  describe('resumeAt() — deferred resume seek [obligation]', () => {
    test('reflects the position immediately but does not seek the element yet', async () => {
      const target = ref(null)
      const [result, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      el.currentTime = 0
      target.value = el
      await nextTick()

      result.resumeAt(42)

      expect(result.current_time.value).toBe(42)
      expect(el.currentTime).toBe(0) // element untouched until the play gesture
    })

    test('applies the armed seek inside play() — the iOS-safe gesture', async () => {
      const target = ref(null)
      const [result, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      el.currentTime = 0
      target.value = el
      await nextTick()

      result.resumeAt(42)
      result.play()

      expect(el.currentTime).toBe(42)
      expect(el.play).toHaveBeenCalled()
    })

    test('only applies once — a second play() does not re-seek', async () => {
      const target = ref(null)
      const [result, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      target.value = el
      await nextTick()

      result.resumeAt(42)
      result.play()
      el.currentTime = 50 // user listened on
      result.play()

      expect(el.currentTime).toBe(50)
    })

    test('a manual seek before play clears the armed resume so the scrub wins', async () => {
      const target = ref(null)
      const [result, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      target.value = el
      await nextTick()

      result.resumeAt(42)
      result.seek(10)
      result.play()

      expect(el.currentTime).toBe(10)
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

  describe('play() failure handling [obligation]', () => {
    test('shows an error notice when el.play() rejects with a non-AbortError [obligation]', async () => {
      const target = ref(null)
      const [result, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      el.play.mockRejectedValueOnce(new Error('network error'))
      target.value = el
      await nextTick()

      result.play()
      await nextTick()
      await nextTick()

      expect(mockNotice.error).toHaveBeenCalledWith('audio-reader.player.play-error')
    })

    test('silently ignores an AbortError rejection (no notice) [obligation]', async () => {
      const target = ref(null)
      const [result, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      el.play.mockRejectedValueOnce(
        new DOMException('The play() request was interrupted', 'AbortError')
      )
      target.value = el
      await nextTick()

      result.play()
      await nextTick()
      await nextTick()

      expect(mockNotice.error).not.toHaveBeenCalled()
    })

    test('playClip() shows an error notice when el.play() rejects with a non-AbortError [obligation]', async () => {
      const target = ref(null)
      const [result, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      el.play.mockRejectedValueOnce(new Error('network error'))
      target.value = el
      await nextTick()

      result.playClip(0, 5)
      await nextTick()
      await nextTick()

      expect(mockNotice.error).toHaveBeenCalledWith('audio-reader.player.play-error')
    })

    test('playClip() silently ignores an AbortError rejection (no notice) [obligation]', async () => {
      const target = ref(null)
      const [result, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      el.play.mockRejectedValueOnce(new DOMException('interrupted', 'AbortError'))
      target.value = el
      await nextTick()

      result.playClip(0, 5)
      await nextTick()
      await nextTick()

      expect(mockNotice.error).not.toHaveBeenCalled()
    })
  })

  describe('rAF tick loop', () => {
    test('tick() copies el.currentTime into current_time', async () => {
      const target = ref(null)
      const [result, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      target.value = el
      await nextTick()

      el._emit('play') // starts ticking
      el.currentTime = 7.5

      // Manually fire the stored rAF callback (tick())
      rafCallback()

      expect(result.current_time.value).toBe(7.5)
    })

    test('tick() re-schedules itself while playing and clip_end not reached', async () => {
      const target = ref(null)
      const [, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      target.value = el
      await nextTick()

      el._emit('play')
      requestAnimationFrame.mockClear()

      rafCallback() // simulate one rAF frame

      expect(requestAnimationFrame).toHaveBeenCalled()
    })

    test('tick() pauses and stops rAF when clip_end is reached', async () => {
      const target = ref(null)
      const [result, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      target.value = el
      await nextTick()

      result.playClip(1, 5) // sets clip_end = 5
      // playClip calls el.play() (mocked) but doesn't fire the play event;
      // fire it manually so startTicking() runs and rafCallback is set.
      el._emit('play')
      el.currentTime = 5 // advance to the clip boundary
      requestAnimationFrame.mockClear()

      rafCallback() // tick fires; clip_end reached → pause

      expect(el.pause).toHaveBeenCalled()
    })
  })

  describe('playClip()', () => {
    test('seeks the element to start and calls el.play()', async () => {
      const target = ref(null)
      const [result, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      target.value = el
      await nextTick()

      result.playClip(3, 10)

      expect(el.currentTime).toBe(3)
      expect(el.play).toHaveBeenCalled()
    })

    test('sets current_time immediately to start without waiting for timeupdate', async () => {
      const target = ref(null)
      const [result, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      target.value = el
      await nextTick()

      result.playClip(3, 10)

      expect(result.current_time.value).toBe(3)
    })

    test('is a no-op when no element is bound', () => {
      const [result, a] = withSetup(() => useAudioPlayer(ref(null)))
      app = a
      // Must not throw
      result.playClip(0, 5)
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

    test('updates current_time from timeupdate while playing (backstop for a stalled rAF)', async () => {
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
      // timeupdate syncs even while playing, so a starved rAF (which would
      // otherwise freeze the transcript cursor mid-playback) self-heals.
      expect(result.current_time.value).toBe(99)
    })
  })

  describe('skip()', () => {
    test('seeks to current_time + delta for a normal in-bounds jump [obligation]', async () => {
      const target = ref(null)
      const [result, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      el.duration = 120
      el.readyState = 1
      target.value = el
      await nextTick()
      // readyState >= 1 triggers onLoaded, so duration.value = 120

      result.seek(30) // current_time = 30
      result.skip(10)

      expect(el.currentTime).toBe(40)
      expect(result.current_time.value).toBe(40)
    })

    test('clamps skip(+delta) past the end to duration [obligation]', async () => {
      const target = ref(null)
      const [result, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      el.duration = 120
      target.value = el
      await nextTick()

      // loadedmetadata not fired, so trigger it manually via readyState trick
      el.readyState = 1
      // Simulate duration being set via seek call baseline
      result.seek(110) // current_time = 110
      // duration.value is 0 unless loadedmetadata fires; trigger it
      el._emit('loadedmetadata')
      // now duration.value = 120

      result.skip(15)

      expect(el.currentTime).toBe(120)
    })

    test('clamps skip(-delta) below 0 to 0 [obligation]', async () => {
      const target = ref(null)
      const [result, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      target.value = el
      await nextTick()

      result.seek(5) // current_time = 5
      result.skip(-15)

      expect(el.currentTime).toBe(0)
      expect(result.current_time.value).toBe(0)
    })

    test('skip clears clip_end by going through seek [obligation]', async () => {
      const target = ref(null)
      const [result, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      el.duration = 120
      el.readyState = 1
      target.value = el
      await nextTick()

      result.playClip(5, 10) // sets clip_end = 10
      el._emit('loadedmetadata') // duration = 120
      el._emit('play')
      // Advance to before clip_end so it hasn't fired yet
      el.currentTime = 7
      result.skip(0) // seek to current_time (7), clearing clip_end

      // clip_end cleared: rAF tick past 10 should NOT auto-pause
      el.currentTime = 11
      rafCallback?.() // tick — if clip_end were still 10, el.pause() would be called

      expect(el.pause).not.toHaveBeenCalled()
    })
  })

  describe('setPlaybackRate()', () => {
    test('sets playback_rate ref to the given rate [obligation]', async () => {
      const target = ref(null)
      const [result, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      target.value = el
      await nextTick()

      result.setPlaybackRate(1.5)

      expect(result.playback_rate.value).toBe(1.5)
    })

    test('applies the rate to the bound element live [obligation]', async () => {
      const target = ref(null)
      const [result, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      target.value = el
      await nextTick()

      result.setPlaybackRate(2)

      expect(el.playbackRate).toBe(2)
    })

    test('rate set while bound survives an element re-bind [obligation]', async () => {
      const target = ref(null)
      const [result, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el1 = makeAudioEl()
      target.value = el1
      await nextTick()

      result.setPlaybackRate(1.5)

      // Swap to a new element — bind() must apply playback_rate.value
      const el2 = makeAudioEl()
      target.value = el2
      await nextTick()

      expect(el2.playbackRate).toBe(1.5)
    })

    test('bind() applies playback_rate to a freshly-bound element [obligation]', async () => {
      const target = ref(null)
      const [result, a] = withSetup(() => useAudioPlayer(target))
      app = a

      // Set rate BEFORE binding an element
      result.setPlaybackRate(0.75)

      // setPlaybackRate with no element bound only updates the ref, not el
      expect(result.playback_rate.value).toBe(0.75)

      const el = makeAudioEl()
      target.value = el
      await nextTick()

      // On bind(), playback_rate.value is applied to the new element
      expect(el.playbackRate).toBe(0.75)
    })
  })

  describe('visibilitychange — background tab / foreground return', () => {
    // We need a spy on document.addEventListener so we can capture the
    // visibilitychange handler and fire it directly.
    let docAddSpy
    let docRemoveSpy
    let registeredVisibilityHandler

    beforeEach(() => {
      registeredVisibilityHandler = null
      docAddSpy = vi.spyOn(document, 'addEventListener').mockImplementation((event, cb) => {
        if (event === 'visibilitychange') registeredVisibilityHandler = cb
      })
      docRemoveSpy = vi.spyOn(document, 'removeEventListener')
    })

    afterEach(() => {
      docAddSpy.mockRestore()
      docRemoveSpy.mockRestore()
      // Reset document.hidden to its jsdom default (false) so it doesn't bleed
      // into subsequent tests — each test that needs a specific value sets it explicitly.
      Object.defineProperty(document, 'hidden', { value: false, configurable: true })
    })

    async function setupWithEl() {
      const target = ref(null)
      const [result, a] = withSetup(() => useAudioPlayer(target))
      app = a
      const el = makeAudioEl()
      target.value = el
      await nextTick()
      return { result, a, el }
    }

    test('registers visibilitychange listener on document when element is bound', async () => {
      await setupWithEl()
      expect(docAddSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
    })

    test('snaps current_time to el.currentTime immediately when page returns to foreground [obligation]', async () => {
      const { result, el } = await setupWithEl()

      // Simulate audio advancing while the tab was hidden
      el.currentTime = 42
      Object.defineProperty(document, 'hidden', { value: false, configurable: true })

      registeredVisibilityHandler()

      expect(result.current_time.value).toBe(42)

      Object.defineProperty(document, 'hidden', { value: false, configurable: true })
    })

    test('does not touch current_time when visibilitychange fires while document.hidden is true [obligation]', async () => {
      const { result, el } = await setupWithEl()

      // current_time starts at 0 — confirm it stays there
      el.currentTime = 99
      Object.defineProperty(document, 'hidden', { value: true, configurable: true })

      registeredVisibilityHandler()

      expect(result.current_time.value).toBe(0)

      Object.defineProperty(document, 'hidden', { value: false, configurable: true })
    })

    test('revives the rAF tick loop on foreground return when still playing [obligation]', async () => {
      const { result, el } = await setupWithEl()

      // Start playing so is_playing = true
      el._emit('play')
      // Clear the rAF calls from the initial play
      requestAnimationFrame.mockClear()

      Object.defineProperty(document, 'hidden', { value: false, configurable: true })

      registeredVisibilityHandler()

      // A fresh requestAnimationFrame must have been scheduled
      expect(requestAnimationFrame).toHaveBeenCalled()

      Object.defineProperty(document, 'hidden', { value: false, configurable: true })
    })

    test('does not revive rAF loop on foreground return when paused [obligation]', async () => {
      const { result, el } = await setupWithEl()

      // Stay paused (is_playing = false by default)
      requestAnimationFrame.mockClear()

      Object.defineProperty(document, 'hidden', { value: false, configurable: true })

      registeredVisibilityHandler()

      expect(requestAnimationFrame).not.toHaveBeenCalled()

      Object.defineProperty(document, 'hidden', { value: false, configurable: true })
    })

    test('removes visibilitychange listener from document when target ref becomes null [obligation]', async () => {
      const target = ref(null)
      const [, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      target.value = el
      await nextTick()

      target.value = null
      await nextTick()

      expect(docRemoveSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
    })

    test('removes visibilitychange listener from document on unmount [obligation]', async () => {
      const target = ref(null)
      const [, a] = withSetup(() => useAudioPlayer(target))
      app = a

      const el = makeAudioEl()
      target.value = el
      await nextTick()

      a.unmount()
      app = null

      expect(docRemoveSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
    })
  })
})
