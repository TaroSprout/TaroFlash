import { describe, test, expect, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import UiScrollBar from '@/components/ui-kit/scroll-bar.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

let _activeWrappers = []
let _activeContainers = []

afterEach(() => {
  for (const w of _activeWrappers) w.unmount()
  _activeWrappers = []
  for (const c of _activeContainers) c.remove()
  _activeContainers = []
})

/** Builds a real scrollable container attached to document.body, addressable by id. */
function makeScrollTarget({ contentHeight = 400, containerHeight = 100 } = {}) {
  const container = document.createElement('div')
  container.id = `scroll-target-${_activeContainers.length}`
  container.style.height = `${containerHeight}px`
  container.style.overflow = 'auto'

  const inner = document.createElement('div')
  inner.style.height = `${contentHeight}px`
  container.appendChild(inner)

  document.body.appendChild(container)
  _activeContainers.push(container)
  return container
}

async function waitForUpdate() {
  await new Promise((resolve) => requestAnimationFrame(resolve))
  await new Promise((resolve) => requestAnimationFrame(resolve))
}

/**
 * The very first measurement can land while the bar itself is still
 * `display:none` (v-show hasn't flushed to the DOM yet), which reads the
 * track as 0px tall and locks the thumb at the MIN_THUMB_PX fallback with
 * nothing left to trigger a re-measure. Nudging the target's height forces a
 * fresh ResizeObserver firing against the now-visible bar, giving drag tests
 * a real (not fallback) geometry to assert against.
 */
async function forceRemeasure(target, containerHeight) {
  target.style.height = `${containerHeight + 1}px`
  await waitForUpdate()
  target.style.height = `${containerHeight}px`
  await waitForUpdate()
}

// Consumers position/size the bar themselves (e.g. `fixed ... top-x bottom-y`);
// give it a real height here so the track/thumb geometry math has something to work with.
function mountScrollBar(props = {}, { trackHeight = 100 } = {}) {
  const wrapper = mount(UiScrollBar, {
    attachTo: document.body,
    props,
    attrs: { style: `height: ${trackHeight}px` }
  })
  _activeWrappers.push(wrapper)
  return wrapper
}

function root(wrapper) {
  return wrapper.find('[data-testid="ui-kit-scroll-bar"]')
}

function thumb(wrapper) {
  return wrapper.find('[data-testid="ui-kit-scroll-bar__thumb"]')
}

// ── Overflow-based visibility ─────────────────────────────────────────────────

describe('UiScrollBar — overflow-based visibility [obligation]', () => {
  test('hides when the target has no overflow, regardless of minWidth', async () => {
    const target = makeScrollTarget({ contentHeight: 50, containerHeight: 100 })
    const wrapper = mountScrollBar({ target: `#${target.id}`, minWidth: 'sm' })
    await waitForUpdate()

    expect(root(wrapper).isVisible()).toBe(false)
  })

  test('shows when the target overflows, with minWidth="sm"', async () => {
    const target = makeScrollTarget({ contentHeight: 400, containerHeight: 100 })
    const wrapper = mountScrollBar({ target: `#${target.id}`, minWidth: 'sm' })
    await waitForUpdate()

    expect(root(wrapper).isVisible()).toBe(true)
  })

  test('shows when the target overflows, with the default minWidth ("md")', async () => {
    const target = makeScrollTarget({ contentHeight: 400, containerHeight: 100 })
    const wrapper = mountScrollBar({ target: `#${target.id}` })
    await waitForUpdate()

    expect(root(wrapper).isVisible()).toBe(true)
  })

  test('hides again once overflow is resolved (content shrinks below the container height)', async () => {
    const target = makeScrollTarget({ contentHeight: 400, containerHeight: 100 })
    const wrapper = mountScrollBar({ target: `#${target.id}` })
    await waitForUpdate()
    expect(root(wrapper).isVisible()).toBe(true)

    target.firstElementChild.style.height = '50px'
    target.dispatchEvent(new Event('scroll'))
    await waitForUpdate()

    expect(root(wrapper).isVisible()).toBe(false)
  })
})

// ── minWidth gates only the pointer/width class, never overflow ────────────────

describe('UiScrollBar — minWidth gate', () => {
  test('minWidth="sm" is reflected on the root element', () => {
    const wrapper = mountScrollBar({ minWidth: 'sm' })
    expect(root(wrapper).attributes('data-min-width')).toBe('sm')
  })

  test('default minWidth ("md") is reflected on the root element', () => {
    const wrapper = mountScrollBar()
    expect(root(wrapper).attributes('data-min-width')).toBe('md')
  })
})

// ── Thumb geometry ──────────────────────────────────────────────────────────────

describe('UiScrollBar — thumb geometry', () => {
  test('sizes the thumb proportionally to the visible/scrollable ratio', async () => {
    const target = makeScrollTarget({ contentHeight: 400, containerHeight: 100 })
    const wrapper = mountScrollBar({ target: `#${target.id}` })
    await waitForUpdate()

    const height = Number.parseFloat(
      thumb(wrapper)
        .attributes('style')
        .match(/height:\s*(\d+)/)[1]
    )
    expect(height).toBeGreaterThan(0)
  })

  test('moves the thumb down as the target is scrolled', async () => {
    const target = makeScrollTarget({ contentHeight: 400, containerHeight: 100 })
    const wrapper = mountScrollBar({ target: `#${target.id}` })
    await waitForUpdate()
    const before = thumb(wrapper).attributes('style')

    target.scrollTop = 200
    target.dispatchEvent(new Event('scroll'))
    await waitForUpdate()
    const after = thumb(wrapper).attributes('style')

    expect(after).not.toBe(before)
  })
})

// ── Target resolution ─────────────────────────────────────────────────────────

describe('UiScrollBar — target resolution', () => {
  test('falls back to the window/page target when no target prop is given', async () => {
    const wrapper = mountScrollBar()
    await waitForUpdate()

    expect(root(wrapper).exists()).toBe(true)
  })

  test('resolves "body" to document.body as a page target', async () => {
    const wrapper = mountScrollBar({ target: 'body' })
    await waitForUpdate()

    expect(root(wrapper).exists()).toBe(true)
  })

  test('accepts a direct HTMLElement as the target', async () => {
    const target = makeScrollTarget({ contentHeight: 400, containerHeight: 100 })
    const wrapper = mountScrollBar({ target })
    await waitForUpdate()

    expect(root(wrapper).isVisible()).toBe(true)
  })
})

// ── Cleanup ───────────────────────────────────────────────────────────────────

describe('UiScrollBar — cleanup', () => {
  test('unmounting a container-targeted bar does not throw', async () => {
    const target = makeScrollTarget({ contentHeight: 400, containerHeight: 100 })
    const wrapper = mountScrollBar({ target: `#${target.id}` })
    await waitForUpdate()

    expect(() => wrapper.unmount()).not.toThrow()
  })

  test('unmounting a window-targeted bar does not throw', async () => {
    const wrapper = mountScrollBar()
    await waitForUpdate()

    expect(() => wrapper.unmount()).not.toThrow()
  })
})

// ── Drag interaction ──────────────────────────────────────────────────────────

describe('UiScrollBar — thumb drag', () => {
  test('dragging the thumb scrolls the target', async () => {
    const target = makeScrollTarget({ contentHeight: 400, containerHeight: 100 })
    const wrapper = mountScrollBar({ target: `#${target.id}` })
    await waitForUpdate()
    await forceRemeasure(target, 100)

    const thumbEl = thumb(wrapper).element
    thumbEl.setPointerCapture = () => {}
    thumbEl.dispatchEvent(
      new PointerEvent('pointerdown', { clientY: 0, pointerId: 1, bubbles: true })
    )
    window.dispatchEvent(new PointerEvent('pointermove', { clientY: 40, pointerId: 1 }))
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }))
    await waitForUpdate()

    expect(target.scrollTop).toBeGreaterThan(0)
  })

  test('clicking the track (not the thumb) jumps the scroll position', async () => {
    const target = makeScrollTarget({ contentHeight: 400, containerHeight: 100 })
    const wrapper = mountScrollBar({ target: `#${target.id}` })
    await waitForUpdate()
    await forceRemeasure(target, 100)

    const rect = root(wrapper).element.getBoundingClientRect()
    root(wrapper).element.dispatchEvent(
      new PointerEvent('pointerdown', { clientY: rect.top + 80, bubbles: true })
    )
    await waitForUpdate()

    expect(target.scrollTop).toBeGreaterThan(0)
  })
})
