import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'

import AudioPlayer from '@/views/audio-reader/lesson/audio-player.vue'
import UiButton from '@/components/ui-kit/button.vue'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makePlayer(overrides = {}) {
  return {
    current_time: ref(0),
    duration: ref(120),
    is_playing: ref(false),
    play: vi.fn(),
    pause: vi.fn(),
    seek: vi.fn(),
    ...overrides
  }
}

function mountPlayer(player) {
  return shallowMount(AudioPlayer, { props: { player } })
}

function stubTrackRect(wrapper, { left = 0, width = 200 } = {}) {
  const track = wrapper.find('[data-testid="audio-player__track"]')
  track.element.getBoundingClientRect = () => ({
    left,
    width,
    right: left + width,
    top: 0,
    bottom: 0,
    height: 0
  })
  // The real browser throws on setPointerCapture without an active pointer.
  track.element.setPointerCapture = () => {}
  return track
}

function scrub(track, clientX) {
  track.element.dispatchEvent(new PointerEvent('pointerdown', { clientX, bubbles: true }))
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AudioPlayer', () => {
  describe('play/pause toggle', () => {
    test('plays when paused', async () => {
      const player = makePlayer({ is_playing: ref(false) })
      const wrapper = mountPlayer(player)

      await wrapper.find('[data-testid="audio-player__toggle"]').trigger('click')

      expect(player.play).toHaveBeenCalledOnce()
      expect(player.pause).not.toHaveBeenCalled()
    })

    test('pauses when playing', async () => {
      const player = makePlayer({ is_playing: ref(true) })
      const wrapper = mountPlayer(player)

      await wrapper.find('[data-testid="audio-player__toggle"]').trigger('click')

      expect(player.pause).toHaveBeenCalledOnce()
      expect(player.play).not.toHaveBeenCalled()
    })

    test('shows the play icon when paused and the pause icon when playing', () => {
      const paused = mountPlayer(makePlayer({ is_playing: ref(false) }))
      expect(paused.findComponent(UiButton).props('iconLeft')).toBe('play')

      const playing = mountPlayer(makePlayer({ is_playing: ref(true) }))
      expect(playing.findComponent(UiButton).props('iconLeft')).toBe('pause')
    })
  })

  describe('progress fill', () => {
    test('width reflects current_time over duration', () => {
      const wrapper = mountPlayer(makePlayer({ current_time: ref(30), duration: ref(120) }))

      expect(wrapper.find('[data-testid="audio-player__fill"]').attributes('style')).toContain(
        'width: 25%'
      )
    })

    test('reacts to current_time changes', async () => {
      const player = makePlayer({ current_time: ref(30), duration: ref(120) })
      const wrapper = mountPlayer(player)

      player.current_time.value = 60
      await nextTick()

      expect(wrapper.find('[data-testid="audio-player__fill"]').attributes('style')).toContain(
        'width: 50%'
      )
    })

    test('stays at 0% when duration is zero (no divide-by-zero)', () => {
      const wrapper = mountPlayer(makePlayer({ current_time: ref(10), duration: ref(0) }))

      expect(wrapper.find('[data-testid="audio-player__fill"]').attributes('style')).toContain(
        'width: 0%'
      )
    })

    test('exposes rounded progress as aria-valuenow', () => {
      const wrapper = mountPlayer(makePlayer({ current_time: ref(40), duration: ref(120) }))

      expect(wrapper.find('[data-testid="audio-player__track"]').attributes('aria-valuenow')).toBe(
        '33'
      )
    })
  })

  describe('time labels', () => {
    test('formats current time and duration as m:ss', () => {
      const wrapper = mountPlayer(makePlayer({ current_time: ref(72), duration: ref(5) }))

      expect(wrapper.find('[data-testid="audio-player__current"]').text()).toBe('1:12')
      expect(wrapper.find('[data-testid="audio-player__duration"]').text()).toBe('0:05')
    })

    test('falls back to 0:00 for a non-finite duration', () => {
      const wrapper = mountPlayer(makePlayer({ duration: ref(Number.NaN) }))

      expect(wrapper.find('[data-testid="audio-player__duration"]').text()).toBe('0:00')
    })
  })

  describe('seek on scrub', () => {
    test('seeks to the fraction of duration under the pointer', () => {
      const player = makePlayer({ duration: ref(120) })
      const track = stubTrackRect(mountPlayer(player), { left: 0, width: 200 })

      scrub(track, 100)

      expect(player.seek).toHaveBeenCalledWith(60)
    })

    test('clamps past the right edge to the end', () => {
      const player = makePlayer({ duration: ref(120) })
      const track = stubTrackRect(mountPlayer(player), { left: 0, width: 200 })

      scrub(track, 300)

      expect(player.seek).toHaveBeenCalledWith(120)
    })

    test('clamps before the left edge to the start', () => {
      const player = makePlayer({ duration: ref(120) })
      const track = stubTrackRect(mountPlayer(player), { left: 0, width: 200 })

      scrub(track, -50)

      expect(player.seek).toHaveBeenCalledWith(0)
    })

    test('does not seek when duration is unknown', () => {
      const player = makePlayer({ duration: ref(0) })
      const track = stubTrackRect(mountPlayer(player), { left: 0, width: 200 })

      scrub(track, 100)

      expect(player.seek).not.toHaveBeenCalled()
    })
  })
})
