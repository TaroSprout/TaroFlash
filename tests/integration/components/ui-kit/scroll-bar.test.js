import { describe, test, expect, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import UiScrollBar from '@/components/ui-kit/scroll-bar.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

let _activeWrappers = []

afterEach(() => {
  for (const w of _activeWrappers) w.unmount()
  _activeWrappers = []
})

async function waitForUpdate() {
  await new Promise((resolve) => requestAnimationFrame(resolve))
  await new Promise((resolve) => requestAnimationFrame(resolve))
}

// Consumers give the bar a real fixed height via CSS — give it one here so the
// track/thumb geometry math has something to work with.
function mountScrollBar(props = {}, { trackHeight = 100 } = {}) {
  const wrapper = mount(UiScrollBar, {
    attachTo: document.body,
    props: { progress: 0, visible_fraction: 0.25, ...props },
    attrs: { style: `height: ${trackHeight}px` }
  })
  _activeWrappers.push(wrapper)
  return wrapper
}

function track(wrapper) {
  return wrapper.find('[data-testid="ui-kit-scroll-bar"]')
}

function thumb(wrapper) {
  return wrapper.find('[data-testid="ui-kit-scroll-bar__thumb"]')
}

function thumbHeightPx(wrapper) {
  return Number.parseFloat(
    thumb(wrapper)
      .attributes('style')
      .match(/height:\s*(\d+)/)[1]
  )
}

/** Real pointer capture requires an actual hardware pointer down — stub it out for synthetic events. */
function stubPointerCapture(el) {
  el.setPointerCapture = () => {}
  el.hasPointerCapture = () => true
  el.releasePointerCapture = () => {}
}

// ── Thumb geometry ──────────────────────────────────────────────────────────────

describe('UiScrollBar — thumb geometry', () => {
  test('sizes the thumb proportionally to visible_fraction', async () => {
    const wrapper = mountScrollBar({ visible_fraction: 0.5 }, { trackHeight: 100 })
    await waitForUpdate()

    expect(thumbHeightPx(wrapper)).toBe(50)
  })

  test('floors the thumb height at 24px even for a tiny visible_fraction', async () => {
    const wrapper = mountScrollBar({ visible_fraction: 0.01 }, { trackHeight: 100 })
    await waitForUpdate()

    expect(thumbHeightPx(wrapper)).toBe(24)
  })

  test('positions the thumb per progress within the track', async () => {
    const wrapper = mountScrollBar({ progress: 1, visible_fraction: 0.5 }, { trackHeight: 100 })
    await waitForUpdate()

    // travel = 100 - 50 = 50; progress=1 → translateY(50px)
    expect(thumb(wrapper).attributes('style')).toContain('translateY(50px)')
  })
})

// ── Drag interaction [obligation] ────────────────────────────────────────────

describe('UiScrollBar — drag moves scroll 1:1 and clamps at both ends [obligation]', () => {
  test('dragging the thumb down emits a drag progress matching the pixel delta over the travel', async () => {
    const wrapper = mountScrollBar({ progress: 0, visible_fraction: 0.5 }, { trackHeight: 100 })
    await waitForUpdate()
    const thumbEl = thumb(wrapper).element
    stubPointerCapture(thumbEl)

    // travel = 100 - 50 = 50px; a 25px drag should read back as progress 0.5
    thumbEl.dispatchEvent(
      new PointerEvent('pointerdown', { clientY: 0, pointerId: 1, bubbles: true })
    )
    thumbEl.dispatchEvent(
      new PointerEvent('pointermove', { clientY: 25, pointerId: 1, bubbles: true })
    )
    await waitForUpdate()

    expect(wrapper.emitted('drag')).toBeTruthy()
    const [progress] = wrapper.emitted('drag').at(-1)
    expect(progress).toBeCloseTo(0.5, 5)
  })

  test('dragging past the top clamps the emitted progress to 0', async () => {
    const wrapper = mountScrollBar({ progress: 0.5, visible_fraction: 0.5 }, { trackHeight: 100 })
    await waitForUpdate()
    const thumbEl = thumb(wrapper).element
    stubPointerCapture(thumbEl)

    thumbEl.dispatchEvent(
      new PointerEvent('pointerdown', { clientY: 100, pointerId: 1, bubbles: true })
    )
    thumbEl.dispatchEvent(
      new PointerEvent('pointermove', { clientY: -1000, pointerId: 1, bubbles: true })
    )
    await waitForUpdate()

    const [progress] = wrapper.emitted('drag').at(-1)
    expect(progress).toBe(0)
  })

  test('dragging past the bottom clamps the emitted progress to 1', async () => {
    const wrapper = mountScrollBar({ progress: 0.5, visible_fraction: 0.5 }, { trackHeight: 100 })
    await waitForUpdate()
    const thumbEl = thumb(wrapper).element
    stubPointerCapture(thumbEl)

    thumbEl.dispatchEvent(
      new PointerEvent('pointerdown', { clientY: 100, pointerId: 1, bubbles: true })
    )
    thumbEl.dispatchEvent(
      new PointerEvent('pointermove', { clientY: 1000, pointerId: 1, bubbles: true })
    )
    await waitForUpdate()

    const [progress] = wrapper.emitted('drag').at(-1)
    expect(progress).toBe(1)
  })
})

// ── Cleanup releases pointer capture [obligation] ────────────────────────────

describe('UiScrollBar — pointercancel and unmount leave dragging false with capture released [obligation]', () => {
  test('data-active flips true while dragging, false again on pointercancel', async () => {
    const wrapper = mountScrollBar({ progress: 0, visible_fraction: 0.5 }, { trackHeight: 100 })
    await waitForUpdate()
    const thumbEl = thumb(wrapper).element
    stubPointerCapture(thumbEl)

    thumbEl.dispatchEvent(
      new PointerEvent('pointerdown', { clientY: 0, pointerId: 1, bubbles: true })
    )
    await waitForUpdate()
    expect(thumb(wrapper).attributes('data-active')).toBe('true')

    thumbEl.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, bubbles: true }))
    await waitForUpdate()

    expect(thumb(wrapper).attributes('data-active')).toBe('false')
  })

  test('pointercancel releases the captured pointer', async () => {
    const wrapper = mountScrollBar({ progress: 0, visible_fraction: 0.5 }, { trackHeight: 100 })
    await waitForUpdate()
    const thumbEl = thumb(wrapper).element
    stubPointerCapture(thumbEl)
    let released = false
    thumbEl.releasePointerCapture = () => (released = true)

    thumbEl.dispatchEvent(
      new PointerEvent('pointerdown', { clientY: 0, pointerId: 1, bubbles: true })
    )
    thumbEl.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, bubbles: true }))
    await waitForUpdate()

    expect(released).toBe(true)
  })

  test('unmounting mid-drag does not throw and releases capture', async () => {
    const wrapper = mountScrollBar({ progress: 0, visible_fraction: 0.5 }, { trackHeight: 100 })
    await waitForUpdate()
    const thumbEl = thumb(wrapper).element
    stubPointerCapture(thumbEl)
    let released = false
    thumbEl.releasePointerCapture = () => (released = true)

    thumbEl.dispatchEvent(
      new PointerEvent('pointerdown', { clientY: 0, pointerId: 1, bubbles: true })
    )

    expect(() => wrapper.unmount()).not.toThrow()
    expect(released).toBe(true)
    _activeWrappers = _activeWrappers.filter((w) => w !== wrapper)
  })
})

// ── Visibility variant [obligation] ──────────────────────────────────────────
// The whole md-breakpoint fix rides on this one compound class — a plain
// `pointer-fine:block` would show the bar below 832px again, and dropping the
// `pointer-fine:` half would show it on a coarse (touch) pointer at any width.

describe('UiScrollBar — track visibility class [obligation]', () => {
  test('carries the compound md:pointer-fine:block variant alongside hidden', async () => {
    const wrapper = mountScrollBar()
    await waitForUpdate()

    const classes = track(wrapper).classes()
    expect(classes).toContain('md:pointer-fine:block')
    expect(classes).toContain('hidden')
  })

  test('never regresses to a bare pointer-fine:block missing the md gate', async () => {
    const wrapper = mountScrollBar()
    await waitForUpdate()

    expect(track(wrapper).classes()).not.toContain('pointer-fine:block')
  })

  test('never regresses to a bare md:block missing the coarse-pointer suppression', async () => {
    const wrapper = mountScrollBar()
    await waitForUpdate()

    expect(track(wrapper).classes()).not.toContain('md:block')
  })
})

// ── Track press [obligation] ─────────────────────────────────────────────────

describe('UiScrollBar — track press centres the handle on the press point [obligation]', () => {
  test('pressing the track emits a jump that centres the thumb on the press point', async () => {
    const wrapper = mountScrollBar({ progress: 0, visible_fraction: 0.5 }, { trackHeight: 100 })
    await waitForUpdate()

    const rect = track(wrapper).element.getBoundingClientRect()
    // thumb height = 50px; pressing the track's vertical midpoint should
    // centre the thumb there, i.e. offset = midpoint - thumbHeight/2.
    const press_y = rect.top + 50
    track(wrapper).element.dispatchEvent(
      new PointerEvent('pointerdown', { clientY: press_y, bubbles: true })
    )

    expect(wrapper.emitted('jump')).toBeTruthy()
    const [progress] = wrapper.emitted('jump').at(-1)
    // travel = 100 - 50 = 50px; offset = (50 - 25) = 25 → progress 0.5
    expect(progress).toBeCloseTo(0.5, 5)
  })

  test('pressing directly on the thumb does not emit a jump', async () => {
    const wrapper = mountScrollBar({ progress: 0, visible_fraction: 0.5 }, { trackHeight: 100 })
    await waitForUpdate()
    stubPointerCapture(thumb(wrapper).element)

    thumb(wrapper).element.dispatchEvent(
      new PointerEvent('pointerdown', { clientY: 10, pointerId: 1, bubbles: true })
    )

    expect(wrapper.emitted('jump')).toBeFalsy()
  })
})
