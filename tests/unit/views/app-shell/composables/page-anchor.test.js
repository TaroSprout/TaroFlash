import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createApp, defineComponent, h, ref } from 'vue'
import { providePageAnchor, usePageAnchorClaim } from '@/views/app-shell/composables/page-anchor'

// ── Host-app helper ────────────────────────────────────────────────────────────
// Mounts a real Vue tree so onBeforeUnmount fires for the claiming pane on its
// own unmount, not just the whole app's.

const PaneStub = defineComponent({
  name: 'PaneStub',
  props: { source: { type: Object, required: true } },
  setup(props) {
    usePageAnchorClaim(props.source)
    return () => null
  }
})

function withSetup() {
  let anchor
  const pane_mounted = ref(false)
  const pane_source = ref(null)

  const app = createApp({
    setup() {
      anchor = providePageAnchor()
      return () => (pane_mounted.value ? h(PaneStub, { source: pane_source }) : null)
    }
  })

  const el = document.createElement('div')
  document.body.appendChild(el)
  app.mount(el)

  return {
    anchor,
    pane_mounted,
    pane_source,
    unmount: () => {
      app.unmount()
      el.remove()
    }
  }
}

// ── Layout-offset stub ─────────────────────────────────────────────────────────
// jsdom never lays elements out, so offsetWidth/offsetLeft/offsetParent all read
// 0/0/null by default. The composable walks that chain rather than reading a
// bounding rect, so a claimed element's position has to be stubbed through it.

function stubOffset(el, { width = 0, left = 0, parent = null } = {}) {
  const widthSpy = vi.spyOn(el, 'offsetWidth', 'get').mockReturnValue(width)
  const leftSpy = vi.spyOn(el, 'offsetLeft', 'get').mockReturnValue(left)
  vi.spyOn(el, 'offsetParent', 'get').mockReturnValue(parent)
  return { widthSpy, leftSpy }
}

// ── ResizeObserver fake ────────────────────────────────────────────────────────
// jsdom has none. The composable observes the claimed element to catch it
// resizing on its own, independent of the window.

class FakeResizeObserver {
  constructor(callback) {
    this.callback = callback
  }
  observe() {}
  disconnect() {}
}

let unmount
let rafSpy

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', FakeResizeObserver)
  // Runs the rAF callback synchronously so `schedule()` behaves like `measure()`.
  rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
    cb(0)
    return 1
  })
})

afterEach(() => {
  unmount?.()
  unmount = undefined
  rafSpy.mockRestore()
  vi.unstubAllGlobals()
})

// ── Nothing claimed ────────────────────────────────────────────────────────────

describe('providePageAnchor — nothing claimed', () => {
  test('inset is null when nothing has claimed it', () => {
    const setup = withSetup()
    unmount = setup.unmount

    expect(setup.anchor.inset.value).toBeNull()
  })
})

// ── A pane claims the anchor ──────────────────────────────────────────────────

describe('providePageAnchor — a pane claims the anchor', () => {
  test('inset becomes the viewport clientWidth minus the claimed element right edge', async () => {
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(1200)

    // 400 wide, sitting 300 into a parent that itself sits 200 in: a right edge
    // at 900 that only adds up if every link in the offsetParent chain counts.
    const outer_el = document.createElement('div')
    stubOffset(outer_el, { left: 200 })

    const pane_el = document.createElement('div')
    stubOffset(pane_el, { width: 400, left: 300, parent: outer_el })

    const setup = withSetup()
    unmount = setup.unmount

    setup.pane_mounted.value = true
    setup.pane_source.value = pane_el
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(setup.anchor.inset.value).toBe(300)
  })

  test('unmounting the claiming pane clears inset back to null', async () => {
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(1200)

    const pane_el = document.createElement('div')
    stubOffset(pane_el, { width: 0, left: 900 })

    const setup = withSetup()
    unmount = setup.unmount

    setup.pane_mounted.value = true
    setup.pane_source.value = pane_el
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(setup.anchor.inset.value).not.toBeNull()

    setup.pane_mounted.value = false
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(setup.anchor.inset.value).toBeNull()
  })

  test('a window resize event re-measures the claimed pane', async () => {
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(1200)

    const pane_el = document.createElement('div')
    const { leftSpy } = stubOffset(pane_el, { width: 400, left: 500 })

    const setup = withSetup()
    unmount = setup.unmount

    setup.pane_mounted.value = true
    setup.pane_source.value = pane_el
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(setup.anchor.inset.value).toBe(300)

    leftSpy.mockReturnValue(400)
    window.dispatchEvent(new Event('resize'))

    expect(setup.anchor.inset.value).toBe(400)
  })
})
