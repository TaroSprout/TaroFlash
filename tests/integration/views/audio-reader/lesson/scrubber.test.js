import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import Scrubber from '@/views/audio-reader/lesson/scrubber.vue'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makePlayer(overrides = {}) {
  return {
    current_time: ref(0),
    duration: ref(120),
    seek: vi.fn(),
    ...overrides
  }
}

function stubTrackRect(wrapper, { left = 0, width = 200 } = {}) {
  const track = wrapper.find('[data-testid="scrubber__track"]')
  track.element.getBoundingClientRect = () => ({
    left,
    width,
    right: left + width,
    top: 0,
    bottom: 0,
    height: 0
  })
  track.element.setPointerCapture = () => {}
  return track
}

function scrub(track, clientX) {
  track.element.dispatchEvent(new PointerEvent('pointerdown', { clientX, bubbles: true }))
}

describe('Scrubber', () => {
  // ── Layout prop ────────────────────────────────────────────────────────────

  test('layout="inline" renders scrubber__current and scrubber__duration spans [obligation]', () => {
    const player = makePlayer({ current_time: ref(30), duration: ref(120) })
    const wrapper = shallowMount(Scrubber, { props: { player, layout: 'inline' } })

    expect(wrapper.find('[data-testid="scrubber__current"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="scrubber__duration"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="scrubber__labels"]').exists()).toBe(false)
  })

  test('layout="stacked" renders the scrubber__labels row [obligation]', () => {
    const player = makePlayer()
    const wrapper = shallowMount(Scrubber, { props: { player, layout: 'stacked' } })

    expect(wrapper.find('[data-testid="scrubber__labels"]').exists()).toBe(true)
  })

  test('data-layout attribute reflects the layout prop', () => {
    const player = makePlayer()
    const inline = shallowMount(Scrubber, { props: { player, layout: 'inline' } })
    const stacked = shallowMount(Scrubber, { props: { player, layout: 'stacked' } })

    expect(inline.find('[data-testid="scrubber"]').attributes('data-layout')).toBe('inline')
    expect(stacked.find('[data-testid="scrubber"]').attributes('data-layout')).toBe('stacked')
  })

  test('defaults to layout="inline" when prop is omitted', () => {
    const player = makePlayer()
    const wrapper = shallowMount(Scrubber, { props: { player } })

    expect(wrapper.find('[data-testid="scrubber"]').attributes('data-layout')).toBe('inline')
    expect(wrapper.find('[data-testid="scrubber__labels"]').exists()).toBe(false)
  })

  // ── Fill width tracks progress ──────────────────────────────────────────────

  test('fill width reflects current_time / duration as a percentage [obligation]', () => {
    const player = makePlayer({ current_time: ref(30), duration: ref(120) })
    const wrapper = shallowMount(Scrubber, { props: { player } })

    expect(wrapper.find('[data-testid="scrubber__fill"]').attributes('style')).toContain(
      'width: 25%'
    )
  })

  test('fill width stays 0% when duration is 0 [obligation]', () => {
    const player = makePlayer({ current_time: ref(10), duration: ref(0) })
    const wrapper = shallowMount(Scrubber, { props: { player } })

    expect(wrapper.find('[data-testid="scrubber__fill"]').attributes('style')).toContain(
      'width: 0%'
    )
  })

  test('fill width reacts to current_time changes', async () => {
    const player = makePlayer({ current_time: ref(30), duration: ref(120) })
    const wrapper = shallowMount(Scrubber, { props: { player } })

    player.current_time.value = 60
    await nextTick()

    expect(wrapper.find('[data-testid="scrubber__fill"]').attributes('style')).toContain(
      'width: 50%'
    )
  })

  // ── aria-valuenow ──────────────────────────────────────────────────────────

  test('track aria-valuenow is the rounded progress percentage', () => {
    const player = makePlayer({ current_time: ref(40), duration: ref(120) })
    const wrapper = shallowMount(Scrubber, { props: { player } })

    expect(wrapper.find('[data-testid="scrubber__track"]').attributes('aria-valuenow')).toBe('33')
  })

  // ── Seek on scrub ──────────────────────────────────────────────────────────

  test('pointerdown seeks to the fraction of duration under the pointer [obligation]', () => {
    const player = makePlayer({ duration: ref(120) })
    const wrapper = shallowMount(Scrubber, { props: { player } })
    const track = stubTrackRect(wrapper, { left: 0, width: 200 })

    scrub(track, 100)

    expect(player.seek).toHaveBeenCalledWith(60)
  })

  test('pointerdown clamps past the right edge to duration [obligation]', () => {
    const player = makePlayer({ duration: ref(120) })
    const wrapper = shallowMount(Scrubber, { props: { player } })
    const track = stubTrackRect(wrapper, { left: 0, width: 200 })

    scrub(track, 300)

    expect(player.seek).toHaveBeenCalledWith(120)
  })

  test('pointerdown clamps before the left edge to 0 [obligation]', () => {
    const player = makePlayer({ duration: ref(120) })
    const wrapper = shallowMount(Scrubber, { props: { player } })
    const track = stubTrackRect(wrapper, { left: 0, width: 200 })

    scrub(track, -50)

    expect(player.seek).toHaveBeenCalledWith(0)
  })

  test('pointerdown is a no-op when duration is 0 [obligation]', () => {
    const player = makePlayer({ duration: ref(0) })
    const wrapper = shallowMount(Scrubber, { props: { player } })
    const track = stubTrackRect(wrapper, { left: 0, width: 200 })

    scrub(track, 100)

    expect(player.seek).not.toHaveBeenCalled()
  })

  // ── Time label formatting ──────────────────────────────────────────────────

  test('formats current time and duration as m:ss in inline layout', () => {
    const player = makePlayer({ current_time: ref(72), duration: ref(5) })
    const wrapper = shallowMount(Scrubber, { props: { player, layout: 'inline' } })

    expect(wrapper.find('[data-testid="scrubber__current"]').text()).toBe('1:12')
    expect(wrapper.find('[data-testid="scrubber__duration"]').text()).toBe('0:05')
  })

  test('falls back to 0:00 for a non-finite duration in stacked layout', () => {
    const player = makePlayer({ duration: ref(Number.NaN) })
    const wrapper = shallowMount(Scrubber, { props: { player, layout: 'stacked' } })

    const labels = wrapper.findAll('[data-testid="scrubber__labels"] span')
    expect(labels[1].text()).toBe('0:00')
  })
})
