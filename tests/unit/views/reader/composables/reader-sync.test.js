import { describe, test, expect, afterEach, beforeEach, vi } from 'vite-plus/test'
import { createApp, nextTick, ref } from 'vue'
import { usePageAudioSync } from '@/views/reader/composables/reader-sync'

let app = null

beforeEach(() => vi.useFakeTimers())

afterEach(() => {
  app?.unmount()
  app = null
  vi.useRealTimers()
})

function spreadOfWord(word) {
  return Math.floor(word / 10)
}
function firstWordOfSpread(spread) {
  return spread * 10
}

function withSync({ is_playing = ref(false), active_word = ref(-1), at_rest = ref(true) } = {}) {
  let result
  const seekToWord = vi.fn()

  const host = createApp({
    setup() {
      result = usePageAudioSync({
        is_playing: () => is_playing.value,
        active_word: () => active_word.value,
        at_rest: () => at_rest.value,
        spreadOfWord,
        firstWordOfSpread,
        seekToWord
      })
      return () => null
    }
  })

  host.mount(document.createElement('div'))
  app = host

  return { ...result, is_playing, active_word, at_rest, seekToWord }
}

describe('usePageAudioSync', () => {
  describe('onTurn', () => {
    test('sets desired_spread and seeks to the first word of the new spread', () => {
      const { onTurn, desired_spread, seekToWord } = withSync()

      onTurn(2)

      expect(desired_spread.value).toBe(2)
      expect(seekToWord).toHaveBeenCalledWith(20)
    })

    test('does not seek when the spread has no first word', () => {
      let result
      const seekToWord = vi.fn()
      const host = createApp({
        setup() {
          result = usePageAudioSync({
            is_playing: () => false,
            active_word: () => -1,
            at_rest: () => true,
            spreadOfWord,
            firstWordOfSpread: () => undefined,
            seekToWord
          })
          return () => null
        }
      })
      host.mount(document.createElement('div'))

      result.onTurn(5)

      expect(seekToWord).not.toHaveBeenCalled()
      host.unmount()
    })
  })

  describe('follow before engaging', () => {
    test('tracks desired_spread to the active word spread without seeking', async () => {
      const active_word = ref(15)
      const { desired_spread, seekToWord } = withSync({ active_word })

      active_word.value = 27
      await nextTick()

      expect(desired_spread.value).toBe(2)
      expect(seekToWord).not.toHaveBeenCalled()
    })
  })

  describe('follow once engaged', () => {
    test('play() latches engaged — a later pause does not un-engage', async () => {
      const is_playing = ref(false)
      const active_word = ref(5)
      const at_rest = ref(true)
      const { desired_spread } = withSync({ is_playing, active_word, at_rest })

      is_playing.value = true
      await nextTick()
      is_playing.value = false
      await nextTick()

      active_word.value = 32
      await nextTick()

      expect(desired_spread.value).toBe(0)
    })

    test('does not advance while paused, even though engaged', async () => {
      const is_playing = ref(false)
      const active_word = ref(5)
      const at_rest = ref(true)
      const { desired_spread } = withSync({ is_playing, active_word, at_rest })

      is_playing.value = true
      await nextTick()
      is_playing.value = false
      await nextTick()

      active_word.value = 45
      await nextTick()

      expect(desired_spread.value).toBe(0)
    })

    test('does not advance while mid-scroll (not at_rest)', async () => {
      const is_playing = ref(false)
      const active_word = ref(5)
      const at_rest = ref(false)
      const { desired_spread } = withSync({ is_playing, active_word, at_rest })

      is_playing.value = true
      await nextTick()

      active_word.value = 45
      await nextTick()

      expect(desired_spread.value).toBe(0)
    })

    test('advances when playing and at rest', async () => {
      const is_playing = ref(false)
      const active_word = ref(5)
      const at_rest = ref(true)
      const { desired_spread } = withSync({ is_playing, active_word, at_rest })

      is_playing.value = true
      await nextTick()

      active_word.value = 45
      await nextTick()

      expect(desired_spread.value).toBe(4)
    })
  })

  describe('settle window after onTurn', () => {
    test('follow ignores a stale active word until the settle target is reached', async () => {
      const is_playing = ref(true)
      const active_word = ref(1)
      const at_rest = ref(true)
      const { onTurn, desired_spread } = withSync({ is_playing, active_word, at_rest })
      await nextTick()

      onTurn(3)
      expect(desired_spread.value).toBe(3)

      active_word.value = 5
      await nextTick()
      expect(desired_spread.value).toBe(3)

      active_word.value = 35
      await nextTick()
      expect(desired_spread.value).toBe(3)
    })

    test('the settle window expires after SETTLE_TIMEOUT_MS, letting follow through again', async () => {
      const is_playing = ref(true)
      const active_word = ref(1)
      const at_rest = ref(true)
      const { onTurn, desired_spread } = withSync({ is_playing, active_word, at_rest })
      await nextTick()

      onTurn(3)
      vi.advanceTimersByTime(1000)

      active_word.value = 55
      await nextTick()

      expect(desired_spread.value).toBe(5)
    })
  })

  describe('unmount', () => {
    test('clears the pending settle timer', () => {
      const { onTurn } = withSync()

      onTurn(2)
      app.unmount()
      app = null

      expect(() => vi.advanceTimersByTime(2000)).not.toThrow()
    })
  })
})
