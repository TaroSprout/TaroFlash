import { describe, test, expect, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import ScrollRegion from '@/components/layout-kit/scroll-region/index.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────
// Tailwind's utility classes aren't compiled in this test environment, so the
// scroller's own `flex-1`/`min-h-0` can't be trusted to clip it to the parent's
// height. Force real geometry directly with inline styles instead, the same
// way the scroll-bar tests fake a scrollable container.
//
// `stubs: { transition: false }` is not optional: test-utils replaces
// <Transition> with a <transition-stub> element by default, and that extra
// element sits between the region and its handle — which breaks the direct-child
// selector the handle's absolute positioning is written with, leaving the bar
// with no height and nothing to drag.

let _activeWrappers = []
let _activeHosts = []

afterEach(() => {
  for (const w of _activeWrappers) w.unmount()
  _activeWrappers = []
  for (const h of _activeHosts) h.remove()
  _activeHosts = []
})

// ResizeObserver callbacks batch on their own queue, which can lag a couple of
// animation frames behind the DOM mutation that triggered them. The tail wait
// also has to outlast the metrics' 150ms settle window, since the handle is
// held back until the measured overflow stops moving.
async function waitForUpdate() {
  await new Promise((resolve) => requestAnimationFrame(resolve))
  await new Promise((resolve) => requestAnimationFrame(resolve))
  await new Promise((resolve) => setTimeout(resolve, 200))
}

function root(wrapper) {
  return wrapper.find('[data-testid="scroll-region"]')
}

function handle(wrapper) {
  return wrapper.find('[data-testid="scroll-region__handle"]')
}

function content(wrapper) {
  return wrapper.find('[data-testid="content"]')
}

function scroller(wrapper) {
  return wrapper.find('[data-testid="scroll-region__scroller"]')
}

function forceScrollerGeometry(wrapper, height) {
  const el = scroller(wrapper).element
  el.style.height = `${height}px`
  el.style.overflowY = 'auto'
  el.style.display = 'block'
}

/** Mounts a self-scrolling region with a real, fixed-height container and a resizable content child. */
function mountRegion({
  height = 100,
  contentHeight = 500,
  attachTo = document.body,
  props = {},
  attrs = {},
  contentStyle = ''
} = {}) {
  const wrapper = mount(ScrollRegion, {
    attachTo,
    props,
    attrs,
    global: { stubs: { transition: false } },
    slots: {
      default: () =>
        h('div', {
          'data-testid': 'content',
          style: `height: ${contentHeight}px; ${contentStyle}`
        })
    }
  })
  _activeWrappers.push(wrapper)
  if (height !== null) forceScrollerGeometry(wrapper, height)
  return wrapper
}

function pxOf(el, property) {
  return Number.parseFloat(getComputedStyle(el)[property])
}

// ── Handle visibility follows overflow [obligation] ──────────────────────────

describe('ScrollRegion — handle appears only on overflow and disappears when content shrinks [obligation]', () => {
  test('no handle when content fits the container', async () => {
    const wrapper = mountRegion({ height: 100, contentHeight: 50 })
    await waitForUpdate()

    expect(handle(wrapper).exists()).toBe(false)
  })

  test('handle appears once content overflows the container', async () => {
    const wrapper = mountRegion({ height: 100, contentHeight: 500 })
    await waitForUpdate()

    expect(handle(wrapper).exists()).toBe(true)
  })

  test('handle disappears again once content shrinks back under the container height', async () => {
    const wrapper = mountRegion({ height: 100, contentHeight: 500 })
    await waitForUpdate()
    expect(handle(wrapper).exists()).toBe(true)

    content(wrapper).element.style.height = '50px'
    await waitForUpdate()

    expect(handle(wrapper).exists()).toBe(false)
  })
})

// ── Handle resizes on content growth alone [obligation] ──────────────────────

describe('ScrollRegion — handle resizes when content grows with no scroll or resize event [obligation]', () => {
  test('growing the content past the container reveals the handle without a scroll or resize event', async () => {
    const wrapper = mountRegion({ height: 100, contentHeight: 90 })
    await waitForUpdate()
    expect(handle(wrapper).exists()).toBe(false)

    // Mutating the child's own height directly — no scroll/resize event dispatched.
    content(wrapper).element.style.height = '500px'
    await waitForUpdate()

    expect(handle(wrapper).exists()).toBe(true)
  })
})

// ── The gutter is carved out of the inset the consumer declared [obligation] ─
// A consumer says how far in from its end edge the content stops
// (`--scroll-content-inset`) and pads with the `--scroll-content-pad-end` the
// region publishes back. Whatever the region takes for the handle's band, the
// two together have to add back up to the inset the consumer asked for, or the
// content column lands somewhere the design never put it.

describe('ScrollRegion — the handle band plus the published end padding equal the declared inset [obligation]', () => {
  async function mountWithInset(inset) {
    const wrapper = mountRegion({
      height: 100,
      contentHeight: 500,
      props: { gutter: 'inside' },
      attrs: { style: `--scroll-content-inset: ${inset}` },
      contentStyle: 'padding-right: var(--scroll-content-pad-end);'
    })
    await waitForUpdate()
    return wrapper
  }

  test('an inset wider than the gutter leaves the leftover as end padding', async () => {
    const wrapper = await mountWithInset('80px')

    const band = pxOf(scroller(wrapper).element, 'paddingInlineEnd')
    const pad_end = pxOf(content(wrapper).element, 'paddingRight')

    expect(band).toBeGreaterThan(0)
    expect(band + pad_end).toBe(80)
  })

  test('an inset narrower than the gutter narrows the band and leaves no end padding', async () => {
    const wrapper = await mountWithInset('8px')

    const band = pxOf(scroller(wrapper).element, 'paddingInlineEnd')
    const pad_end = pxOf(content(wrapper).element, 'paddingRight')

    expect(band).toBe(8)
    expect(pad_end).toBe(0)
  })

  test('a consumer that declares no inset gets the whole gutter as the band', async () => {
    const wrapper = mountRegion({
      height: 100,
      contentHeight: 500,
      props: { gutter: 'inside' },
      contentStyle: 'padding-right: var(--scroll-content-pad-end);'
    })
    await waitForUpdate()

    expect(pxOf(scroller(wrapper).element, 'paddingInlineEnd')).toBeGreaterThan(0)
    expect(pxOf(content(wrapper).element, 'paddingRight')).toBe(0)
  })

  test('an outside gutter reserves nothing inside the scrolling box', async () => {
    const wrapper = mountRegion({ height: 100, contentHeight: 500 })
    await waitForUpdate()

    expect(pxOf(scroller(wrapper).element, 'paddingInlineEnd')).toBe(0)
  })
})

// ── A host can take the scroller away [obligation] ───────────────────────────
// A window that docks to the viewport edge grows to its children and lets the
// sheet around it do the scrolling. It says so with `--scroll-overflow: visible`
// and a height of auto; the handle then goes on its own, because a box that
// grows to its content never overflows.

describe('ScrollRegion — a host that sets --scroll-overflow drops the scroller [obligation]', () => {
  test('the scrolling box stops scrolling and no handle is drawn', async () => {
    const wrapper = mountRegion({
      height: null,
      contentHeight: 500,
      attrs: { style: '--scroll-overflow: visible;' }
    })
    await waitForUpdate()

    expect(getComputedStyle(scroller(wrapper).element).overflowY).toBe('visible')
    expect(handle(wrapper).exists()).toBe(false)
  })

  test('the same region scrolls and draws a handle without that declaration', async () => {
    const wrapper = mountRegion({ height: 100, contentHeight: 500 })
    await waitForUpdate()

    expect(getComputedStyle(scroller(wrapper).element).overflowY).toBe('auto')
    expect(handle(wrapper).exists()).toBe(true)
  })
})

// ── An external target keeps the host's positioning [obligation] ─────────────

describe('ScrollRegion — data-scroll reflects who owns the scroller [obligation]', () => {
  test('no target: the region owns its own scroller and becomes the positioning box', async () => {
    const wrapper = mountRegion({ height: 100, contentHeight: 500 })
    await waitForUpdate()

    expect(root(wrapper).attributes('data-scroll')).toBe('self')
    expect(getComputedStyle(root(wrapper).element).position).toBe('relative')
  })

  test('an external target: the host stays the positioning box', async () => {
    const external = document.createElement('div')
    external.id = 'external-scroller'
    document.body.appendChild(external)
    _activeHosts.push(external)

    const wrapper = mountRegion({
      height: 100,
      contentHeight: 500,
      props: { target: '#external-scroller' }
    })
    await waitForUpdate()

    expect(root(wrapper).attributes('data-scroll')).toBe('external')
    expect(getComputedStyle(root(wrapper).element).position).toBe('static')
  })
})

// ── Hidden host, revealed later [obligation] ─────────────────────────────────

describe('ScrollRegion — mounted inside a display:none host [obligation]', () => {
  function mountHidden({ height = 100, contentHeight = 500 } = {}) {
    const host = document.createElement('div')
    host.style.display = 'none'
    document.body.appendChild(host)
    _activeHosts.push(host)

    const wrapper = mountRegion({ height, contentHeight, attachTo: host })
    return { wrapper, host }
  }

  test('reports no overflow while the host is hidden', async () => {
    const { wrapper } = mountHidden()
    await waitForUpdate()

    expect(handle(wrapper).exists()).toBe(false)
  })

  test('sizes correctly and the handle appears once the host is revealed', async () => {
    const { wrapper, host } = mountHidden()
    await waitForUpdate()

    host.style.display = ''
    await waitForUpdate()

    expect(handle(wrapper).exists()).toBe(true)
  })

  test('dragging works once the host is revealed', async () => {
    const { wrapper, host } = mountHidden()
    await waitForUpdate()
    host.style.display = ''
    await waitForUpdate()

    const thumbEl = wrapper.find('[data-testid="ui-kit-scroll-bar__thumb"]').element
    thumbEl.setPointerCapture = () => {}
    thumbEl.hasPointerCapture = () => true
    thumbEl.releasePointerCapture = () => {}

    thumbEl.dispatchEvent(
      new PointerEvent('pointerdown', { clientY: 0, pointerId: 1, bubbles: true })
    )
    thumbEl.dispatchEvent(
      new PointerEvent('pointermove', { clientY: 80, pointerId: 1, bubbles: true })
    )
    await waitForUpdate()

    expect(scroller(wrapper).element.scrollTop).toBeGreaterThan(0)
  })
})
