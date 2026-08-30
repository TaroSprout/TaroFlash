import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createApp, nextTick, ref } from 'vue'
import { useScrollMetrics } from '@/components/layout-kit/scroll-region/use-scroll-metrics'

// Mirrors the source's own SETTLE_MS — overflowing only flips to true once the
// measured overflow amount has held still for this long.
const SETTLE_MS = 150

// ── Host-app helper ────────────────────────────────────────────────────────────
// Mounts a minimal Vue app so onBeforeUnmount fires, and the `flush: 'post'`
// target watcher runs against a real (if fake-geometried) DOM tree. The watcher
// only looks the target up once the host has mounted, so every setup awaits a
// tick before the metrics mean anything.

async function withSetup(composable) {
  let result
  const app = createApp({
    setup() {
      result = composable()
      return () => null
    }
  })

  const el = document.createElement('div')
  document.body.appendChild(el)
  app.mount(el)

  await nextTick()

  return {
    result,
    unmount: () => {
      app.unmount()
      el.remove()
    }
  }
}

// ── Fake element geometry ─────────────────────────────────────────────────────

function makeElement({ clientHeight = 100, scrollHeight = 100, scrollTop = 0 } = {}) {
  const el = document.createElement('div')
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: clientHeight })
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: scrollHeight })
  let _scrollTop = scrollTop
  Object.defineProperty(el, 'scrollTop', {
    configurable: true,
    get: () => _scrollTop,
    set: (v) => (_scrollTop = v)
  })
  return el
}

// ── ResizeObserver / MutationObserver fakes ───────────────────────────────────
// jsdom has neither. Capture instances so a test can inspect what was observed
// and disconnected without waiting on a real layout engine.

let resize_instances
let mutation_instances

class FakeResizeObserver {
  constructor(callback) {
    this.callback = callback
    this.observed = []
    this.disconnected = false
    resize_instances.push(this)
  }
  observe(el) {
    this.observed.push(el)
  }
  unobserve(el) {
    this.observed = this.observed.filter((o) => o !== el)
  }
  disconnect() {
    this.disconnected = true
  }
}

class FakeMutationObserver {
  constructor(callback) {
    this.callback = callback
    this.observed = []
    this.disconnected = false
    mutation_instances.push(this)
  }
  observe(el, opts) {
    this.observed.push({ el, opts })
  }
  disconnect() {
    this.disconnected = true
  }
}

let unmount
let rafSpy

beforeEach(() => {
  resize_instances = []
  mutation_instances = []
  vi.stubGlobal('ResizeObserver', FakeResizeObserver)
  vi.stubGlobal('MutationObserver', FakeMutationObserver)
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
  vi.useRealTimers()
})

// ── Basic measurement ─────────────────────────────────────────────────────────

describe('useScrollMetrics — measurement', () => {
  test('reports no overflow, zero progress, and full visible_fraction for content that fits', async () => {
    const el = makeElement({ clientHeight: 100, scrollHeight: 100 })
    const target = ref(el)
    const setup = await withSetup(() => useScrollMetrics(target))
    unmount = setup.unmount

    expect(setup.result.overflowing.value).toBe(false)
    expect(setup.result.progress.value).toBe(0)
    expect(setup.result.visible_fraction.value).toBe(1)
  })

  test('treats a 1px slack as still fitting (sub-pixel rounding)', async () => {
    const el = makeElement({ clientHeight: 100, scrollHeight: 101 })
    const target = ref(el)
    const setup = await withSetup(() => useScrollMetrics(target))
    unmount = setup.unmount

    expect(setup.result.overflowing.value).toBe(false)
  })

  test('flags overflow once content exceeds the 1px slack, after the amount settles', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

    const el = makeElement({ clientHeight: 100, scrollHeight: 102 })
    const target = ref(el)
    const setup = await withSetup(() => useScrollMetrics(target))
    unmount = setup.unmount

    // Mid-settle, before SETTLE_MS has elapsed — not yet reported as overflowing.
    expect(setup.result.overflowing.value).toBe(false)

    await vi.advanceTimersByTimeAsync(SETTLE_MS)

    expect(setup.result.overflowing.value).toBe(true)
  })

  test('clears overflowing immediately once content fits, without waiting for the settle clock', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

    const el = makeElement({ clientHeight: 100, scrollHeight: 300 })
    const target = ref(el)
    const setup = await withSetup(() => useScrollMetrics(target))
    unmount = setup.unmount

    await vi.advanceTimersByTimeAsync(SETTLE_MS)
    expect(setup.result.overflowing.value).toBe(true)

    Object.defineProperty(el, 'scrollHeight', { configurable: true, value: 100 })
    setup.result.measure()

    expect(setup.result.overflowing.value).toBe(false)
  })

  test('computes progress as scrollTop over max scroll', async () => {
    const el = makeElement({ clientHeight: 100, scrollHeight: 300, scrollTop: 100 })
    const target = ref(el)
    const setup = await withSetup(() => useScrollMetrics(target))
    unmount = setup.unmount

    // max_scroll = 300 - 100 = 200; progress = 100 / 200 = 0.5
    expect(setup.result.progress.value).toBe(0.5)
  })

  test('clamps an out-of-range scrollTop (rubber-band overscroll) before computing progress', async () => {
    const el = makeElement({ clientHeight: 100, scrollHeight: 300, scrollTop: -40 })
    const target = ref(el)
    const setup = await withSetup(() => useScrollMetrics(target))
    unmount = setup.unmount

    expect(setup.result.progress.value).toBe(0)
  })
})

// ── Tracking children added/removed from the observed element ──────────────────

describe('useScrollMetrics — trackChildren [obligation]', () => {
  test('observes an element added to the DOM and unobserves one removed, ignoring non-element nodes', async () => {
    const el = makeElement({ clientHeight: 100, scrollHeight: 300 })
    const target = ref(el)
    const setup = await withSetup(() => useScrollMetrics(target))
    unmount = setup.unmount

    const resize_obs = resize_instances[0]
    const mutation_obs = mutation_instances[0]
    const added = document.createElement('div')
    const removed = document.createElement('div')
    const text_node = document.createTextNode('not an element')

    mutation_obs.callback([
      { addedNodes: [added, text_node], removedNodes: [] },
      { addedNodes: [], removedNodes: [removed, text_node] }
    ])

    expect(resize_obs.observed).toContain(added)
  })
})

// ── scrollToProgress ──────────────────────────────────────────────────────────

describe('useScrollMetrics — scrollToProgress', () => {
  test('sets scrollTop proportionally and re-measures', async () => {
    const el = makeElement({ clientHeight: 100, scrollHeight: 300 })
    const target = ref(el)
    const setup = await withSetup(() => useScrollMetrics(target))
    unmount = setup.unmount

    setup.result.scrollToProgress(0.5)

    // max_scroll = 200; 0.5 * 200 = 100
    expect(el.scrollTop).toBe(100)
    expect(setup.result.progress.value).toBe(0.5)
  })

  test('clamps the requested progress to [0, 1]', async () => {
    const el = makeElement({ clientHeight: 100, scrollHeight: 300 })
    const target = ref(el)
    const setup = await withSetup(() => useScrollMetrics(target))
    unmount = setup.unmount

    setup.result.scrollToProgress(5)
    expect(el.scrollTop).toBe(200)

    setup.result.scrollToProgress(-5)
    expect(el.scrollTop).toBe(0)
  })
})

// ── Re-attaching on a late-resolving target [obligation] ─────────────────────

describe('useScrollMetrics — re-attaches when the target ref resolves late [obligation]', () => {
  test('measures nothing while the target is null, then attaches once it resolves', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

    const target = ref(null)
    const setup = await withSetup(() => useScrollMetrics(target))
    unmount = setup.unmount

    expect(setup.result.overflowing.value).toBe(false)
    expect(resize_instances).toHaveLength(0)

    const el = makeElement({ clientHeight: 100, scrollHeight: 300 })
    target.value = el
    await nextTick()

    expect(resize_instances).toHaveLength(1)
    expect(resize_instances[0].observed).toContain(el)

    await vi.advanceTimersByTimeAsync(SETTLE_MS)

    expect(setup.result.overflowing.value).toBe(true)
  })

  test('detaches the previous element before attaching the new one', async () => {
    const first = makeElement({ clientHeight: 100, scrollHeight: 100 })
    const target = ref(first)
    const setup = await withSetup(() => useScrollMetrics(target))
    unmount = setup.unmount

    const second = makeElement({ clientHeight: 100, scrollHeight: 300 })
    target.value = second
    await nextTick()

    expect(resize_instances[0].disconnected).toBe(true)
    expect(resize_instances[1].observed).toContain(second)
  })
})

// ── Selector target, looked up after mount [obligation] ──────────────────────
// `document.querySelector` runs against a tree this composable's own host is
// not in yet during setup, and a selector string never changes to trigger a
// second attempt — so the lookup has to wait for mount or it never lands.

describe('useScrollMetrics — a target named by selector attaches after mount [obligation]', () => {
  let external

  beforeEach(() => {
    external = makeElement({ clientHeight: 100, scrollHeight: 400 })
    external.id = 'external-scroller'
    document.body.appendChild(external)
  })

  afterEach(() => {
    external.remove()
  })

  test('finds the element the selector names and measures it', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

    const target = ref('#external-scroller')
    const setup = await withSetup(() => useScrollMetrics(target))
    unmount = setup.unmount

    expect(resize_instances).toHaveLength(1)
    expect(resize_instances[0].observed).toContain(external)

    await vi.advanceTimersByTimeAsync(SETTLE_MS)

    expect(setup.result.overflowing.value).toBe(true)
  })

  test('a selector that matches nothing leaves the metrics at rest', async () => {
    const target = ref('#no-such-element')
    const setup = await withSetup(() => useScrollMetrics(target))
    unmount = setup.unmount

    expect(resize_instances).toHaveLength(0)
    expect(setup.result.overflowing.value).toBe(false)
    expect(setup.result.progress.value).toBe(0)
  })
})

// ── Page target ────────────────────────────────────────────────────────────────

describe('useScrollMetrics — page target', () => {
  test('resolving to "html" watches the window and document.body, not the element itself', async () => {
    const target = ref('html')
    const addSpy = vi.spyOn(window, 'addEventListener')
    const setup = await withSetup(() => useScrollMetrics(target))
    unmount = setup.unmount

    expect(addSpy).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true })
    expect(addSpy).toHaveBeenCalledWith('resize', expect.any(Function), { passive: true })
    expect(resize_instances).toHaveLength(0)
    expect(mutation_instances).toHaveLength(1)
    expect(mutation_instances[0].observed[0].el).toBe(document.body)
    addSpy.mockRestore()
  })

  test('[obligation] a route swap that grows document.body content re-measures and reveals the handle', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

    const target = ref('html')
    const scrollHeightSpy = vi
      .spyOn(document.documentElement, 'scrollHeight', 'get')
      .mockReturnValue(100)
    const clientHeightSpy = vi
      .spyOn(document.documentElement, 'clientHeight', 'get')
      .mockReturnValue(100)

    const setup = await withSetup(() => useScrollMetrics(target))
    unmount = setup.unmount

    await vi.advanceTimersByTimeAsync(SETTLE_MS)
    expect(setup.result.overflowing.value).toBe(false)

    // A route swapping in taller content — the mutation observer is what
    // catches it, since the root's own box (pinned to the viewport) never resizes.
    scrollHeightSpy.mockReturnValue(400)
    mutation_instances[0].callback()
    await vi.advanceTimersByTimeAsync(SETTLE_MS)

    expect(setup.result.overflowing.value).toBe(true)

    scrollHeightSpy.mockRestore()
    clientHeightSpy.mockRestore()
  })
})

// ── Cleanup on unmount ─────────────────────────────────────────────────────────

describe('useScrollMetrics — cleanup', () => {
  test('unmounting disconnects the resize and mutation observers', async () => {
    const el = makeElement({ clientHeight: 100, scrollHeight: 300 })
    const target = ref(el)
    const setup = await withSetup(() => useScrollMetrics(target))

    setup.unmount()

    expect(resize_instances[0].disconnected).toBe(true)
    expect(mutation_instances[0].disconnected).toBe(true)
  })

  test('unmounting a page-target instance removes the window listeners', async () => {
    const target = ref('html')
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const setup = await withSetup(() => useScrollMetrics(target))

    setup.unmount()

    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    removeSpy.mockRestore()
  })
})
