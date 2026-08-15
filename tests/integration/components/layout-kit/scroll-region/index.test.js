import { describe, test, expect, afterEach, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

const { emitSfxMock } = vi.hoisted(() => ({ emitSfxMock: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: emitSfxMock }))

import ScrollRegion from '@/components/layout-kit/scroll-region/index.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────
// Tailwind's utility classes aren't compiled in this test environment, so the
// scroller's own `flex-1`/`min-h-0` can't be trusted to clip it to the parent's
// height. Force real geometry directly with inline styles instead, the same
// way the scroll-bar tests fake a scrollable container.

let _activeWrappers = []
let _activeHosts = []

afterEach(() => {
  for (const w of _activeWrappers) w.unmount()
  _activeWrappers = []
  for (const h of _activeHosts) h.remove()
  _activeHosts = []
  emitSfxMock.mockClear()
})

// ResizeObserver callbacks batch on their own queue, which can lag a couple of
// animation frames behind the DOM mutation that triggered them.
async function waitForUpdate() {
  await new Promise((resolve) => requestAnimationFrame(resolve))
  await new Promise((resolve) => requestAnimationFrame(resolve))
  await new Promise((resolve) => setTimeout(resolve, 60))
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
function mountRegion({ height = 100, contentHeight = 500, attachTo = document.body } = {}) {
  const wrapper = mount(ScrollRegion, {
    attachTo,
    slots: {
      default: () => h('div', { 'data-testid': 'content', style: `height: ${contentHeight}px` })
    }
  })
  _activeWrappers.push(wrapper)
  forceScrollerGeometry(wrapper, height)
  return wrapper
}

const UiScrollBarStub = defineComponent({
  name: 'UiScrollBar',
  props: ['progress', 'visible_fraction'],
  emits: ['drag', 'jump'],
  setup: () => () => h('div', { 'data-testid': 'scroll-region__handle' })
})

function mountRegionWithStub({ height = 100, contentHeight = 500 } = {}) {
  const wrapper = mount(ScrollRegion, {
    attachTo: document.body,
    global: { stubs: { UiScrollBar: UiScrollBarStub } },
    slots: {
      default: () => h('div', { 'data-testid': 'content', style: `height: ${contentHeight}px` })
    }
  })
  _activeWrappers.push(wrapper)
  forceScrollerGeometry(wrapper, height)
  return wrapper
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

// ── Screenful ticks, jump never ticks [obligation] ────────────────────────────

describe('ScrollRegion — handle_drag_tick fires once per screenful crossed [obligation]', () => {
  test('a drag that crosses N screenfuls ticks exactly N times, silent between crossings', async () => {
    const wrapper = mountRegionWithStub({ height: 100, contentHeight: 500 })
    await waitForUpdate()
    const bar = wrapper.findComponent(UiScrollBarStub)

    // max_scroll = 500 - 100 = 400px; one screenful = 100px = progress step of 0.25.
    bar.vm.$emit('drag', 0) // screenful 0 (start)
    await waitForUpdate()
    bar.vm.$emit('drag', 0.1) // still inside screenful 0 → silent
    await waitForUpdate()
    expect(emitSfxMock).not.toHaveBeenCalled()

    bar.vm.$emit('drag', 0.25) // crosses into screenful 1 → tick
    await waitForUpdate()
    expect(emitSfxMock).toHaveBeenCalledTimes(1)

    bar.vm.$emit('drag', 0.5) // crosses into screenful 2 → tick
    await waitForUpdate()
    expect(emitSfxMock).toHaveBeenCalledTimes(2)
    expect(emitSfxMock).toHaveBeenCalledWith('handle_drag_tick')
  })

  test('a drag that ends exactly on a screenful boundary does not double-tick on a repeat call', async () => {
    const wrapper = mountRegionWithStub({ height: 100, contentHeight: 500 })
    await waitForUpdate()
    const bar = wrapper.findComponent(UiScrollBarStub)

    bar.vm.$emit('drag', 1) // bottom of the track
    await waitForUpdate()
    emitSfxMock.mockClear()

    bar.vm.$emit('drag', 1) // still at the bottom — no new screenful crossed
    await waitForUpdate()

    expect(emitSfxMock).not.toHaveBeenCalled()
  })

  test('a jump never ticks, even when it crosses several screenfuls at once', async () => {
    const wrapper = mountRegionWithStub({ height: 100, contentHeight: 500 })
    await waitForUpdate()
    const bar = wrapper.findComponent(UiScrollBarStub)

    bar.vm.$emit('jump', 1) // jumps straight from screenful 0 to the last screenful
    await waitForUpdate()

    expect(emitSfxMock).not.toHaveBeenCalled()
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
