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
  // fill_width uses `calc(progress% + offsetPx)` so the fill extends to the
  // thumb's center — the thumb (size-4 = 16px) overlaps the fill's rounded cap.
  // Formula: center_offset = THUMB_SIZE/2 - (progress/100)*THUMB_SIZE = 8 - p*16/100
  // At 25%: calc(25% + (8 - 0.25*16)px) = calc(25% + 4px)
  // At 0%:  calc(0% + 8px)
  // At 50%: calc(50% + 0px) = calc(50% + 0px)

  test('fill width reflects current_time / duration as a percentage [obligation]', () => {
    const player = makePlayer({ current_time: ref(30), duration: ref(120) })
    const wrapper = shallowMount(Scrubber, { props: { player } })

    // At 25% progress: center_offset = 8 - 0.25*16 = 4px → calc(25% + 4px)
    expect(wrapper.find('[data-testid="scrubber__fill"]').attributes('style')).toContain('25%')
  })

  test('fill width stays at 0% when duration is 0 [obligation]', () => {
    const player = makePlayer({ current_time: ref(10), duration: ref(0) })
    const wrapper = shallowMount(Scrubber, { props: { player } })

    // progress=0 → calc(0% + 8px)
    expect(wrapper.find('[data-testid="scrubber__fill"]').attributes('style')).toContain('0%')
  })

  test('fill width reacts to current_time changes', async () => {
    const player = makePlayer({ current_time: ref(30), duration: ref(120) })
    const wrapper = shallowMount(Scrubber, { props: { player } })

    player.current_time.value = 60
    await nextTick()

    // At 50% progress: center_offset = 8 - 0.5*16 = 0px → calc(50% + 0px)
    expect(wrapper.find('[data-testid="scrubber__fill"]').attributes('style')).toContain('50%')
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

  // ── Thumb positioning — stays inside track at both ends [obligation] ────────
  // Thumb uses `left: progress%` + `translate: -progress% -50%`
  // This keeps the thumb inside the track: at 0% translate is 0, at 100%
  // translate pulls it back by its full width. Never overhangs either edge.

  test('thumb left style is set to the progress percentage [obligation]', () => {
    const player = makePlayer({ current_time: ref(30), duration: ref(120) })
    const wrapper = shallowMount(Scrubber, { props: { player } })

    // 30/120 = 25%
    const style = wrapper.find('[data-testid="scrubber__thumb"]').attributes('style') ?? ''
    expect(style).toContain('left: 25%')
  })

  test('thumb translate style is -progress% -50% [obligation]', () => {
    const player = makePlayer({ current_time: ref(30), duration: ref(120) })
    const wrapper = shallowMount(Scrubber, { props: { player } })

    // translate: -25% -50%
    const style = wrapper.find('[data-testid="scrubber__thumb"]').attributes('style') ?? ''
    expect(style).toContain('translate: -25% -50%')
  })

  test('thumb is at left:0% at the start (progress=0) [obligation]', () => {
    const player = makePlayer({ current_time: ref(0), duration: ref(120) })
    const wrapper = shallowMount(Scrubber, { props: { player } })

    // At progress=0, left is 0% and translate collapses to 0% -50%
    const style = wrapper.find('[data-testid="scrubber__thumb"]').attributes('style') ?? ''
    expect(style).toContain('left: 0%')
    // translate: -0% renders as 0% in browsers / jsdom
    expect(style).toContain('-50%')
  })

  test('thumb is at left:100% with translate:-100% -50% at the end (progress=100%) [obligation]', () => {
    const player = makePlayer({ current_time: ref(120), duration: ref(120) })
    const wrapper = shallowMount(Scrubber, { props: { player } })

    const style = wrapper.find('[data-testid="scrubber__thumb"]').attributes('style') ?? ''
    expect(style).toContain('left: 100%')
    expect(style).toContain('translate: -100% -50%')
  })

  // ── Stacked layout: track carries data-layout for flex-1 scoping [obligation] ─

  test('track carries data-layout="stacked" in stacked mode [obligation]', () => {
    const player = makePlayer()
    const wrapper = shallowMount(Scrubber, { props: { player, layout: 'stacked' } })

    expect(wrapper.find('[data-testid="scrubber__track"]').attributes('data-layout')).toBe(
      'stacked'
    )
  })

  test('track carries data-layout="inline" in inline mode [obligation]', () => {
    const player = makePlayer()
    const wrapper = shallowMount(Scrubber, { props: { player, layout: 'inline' } })

    expect(wrapper.find('[data-testid="scrubber__track"]').attributes('data-layout')).toBe('inline')
  })

  // ── Stacked layout: labels are out-of-flow (absolute) [obligation] ─────────
  // Labels in stacked mode are positioned absolute so only the bar drives height.

  test('stacked layout labels container has data-testid="scrubber__labels" [obligation]', () => {
    const player = makePlayer()
    const wrapper = shallowMount(Scrubber, { props: { player, layout: 'stacked' } })

    expect(wrapper.find('[data-testid="scrubber__labels"]').exists()).toBe(true)
  })

  test('stacked layout labels render current and duration inside the labels container [obligation]', () => {
    const player = makePlayer({ current_time: ref(30), duration: ref(120) })
    const wrapper = shallowMount(Scrubber, { props: { player, layout: 'stacked' } })

    const labels = wrapper.find('[data-testid="scrubber__labels"]')
    expect(labels.find('[data-testid="scrubber__current"]').text()).toBe('0:30')
    expect(labels.find('[data-testid="scrubber__duration"]').text()).toBe('2:00')
  })
})
