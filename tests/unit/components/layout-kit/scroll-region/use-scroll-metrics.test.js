import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createApp, ref } from 'vue'
import { useScrollMetrics } from '@/components/layout-kit/scroll-region/use-scroll-metrics'

// ── Host-app helper ────────────────────────────────────────────────────────────
// Mounts a minimal Vue app so onBeforeUnmount fires, and the `flush: 'post'`
// target watcher runs against a real (if fake-geometried) DOM tree.

function withSetup(composable) {
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
})

// ── Basic measurement ─────────────────────────────────────────────────────────

describe('useScrollMetrics — measurement', () => {
  test('reports no overflow, zero progress, and full visible_fraction for content that fits', () => {
    const el = makeElement({ clientHeight: 100, scrollHeight: 100 })
    const target = ref(el)
    const setup = withSetup(() => useScrollMetrics(target))
    unmount = setup.unmount

    expect(setup.result.overflowing.value).toBe(false)
    expect(setup.result.progress.value).toBe(0)
    expect(setup.result.visible_fraction.value).toBe(1)
    expect(setup.result.screenful.value).toBe(0)
  })

  test('treats a 1px slack as still fitting (sub-pixel rounding)', () => {
    const el = makeElement({ clientHeight: 100, scrollHeight: 101 })
    const target = ref(el)
    const setup = withSetup(() => useScrollMetrics(target))
    unmount = setup.unmount

    expect(setup.result.overflowing.value).toBe(false)
  })

  test('flags overflow once content exceeds the 1px slack', () => {
    const el = makeElement({ clientHeight: 100, scrollHeight: 102 })
    const target = ref(el)
    const setup = withSetup(() => useScrollMetrics(target))
    unmount = setup.unmount

    expect(setup.result.overflowing.value).toBe(true)
  })

  test('computes progress as scrollTop over max scroll', () => {
    const el = makeElement({ clientHeight: 100, scrollHeight: 300, scrollTop: 100 })
    const target = ref(el)
    const setup = withSetup(() => useScrollMetrics(target))
    unmount = setup.unmount

    // max_scroll = 300 - 100 = 200; progress = 100 / 200 = 0.5
    expect(setup.result.progress.value).toBe(0.5)
  })

  test('computes screenful as the floor of scrollTop / clientHeight', () => {
    const el = makeElement({ clientHeight: 100, scrollHeight: 500, scrollTop: 250 })
    const target = ref(el)
    const setup = withSetup(() => useScrollMetrics(target))
    unmount = setup.unmount

    expect(setup.result.screenful.value).toBe(2)
  })

  test('clamps an out-of-range scrollTop (rubber-band overscroll) before computing progress', () => {
    const el = makeElement({ clientHeight: 100, scrollHeight: 300, scrollTop: -40 })
    const target = ref(el)
    const setup = withSetup(() => useScrollMetrics(target))
    unmount = setup.unmount

    expect(setup.result.progress.value).toBe(0)
  })
})

// ── scrollToProgress ──────────────────────────────────────────────────────────

describe('useScrollMetrics — scrollToProgress', () => {
  test('sets scrollTop proportionally and re-measures', () => {
    const el = makeElement({ clientHeight: 100, scrollHeight: 300 })
    const target = ref(el)
    const setup = withSetup(() => useScrollMetrics(target))
    unmount = setup.unmount

    setup.result.scrollToProgress(0.5)

    // max_scroll = 200; 0.5 * 200 = 100
    expect(el.scrollTop).toBe(100)
    expect(setup.result.progress.value).toBe(0.5)
  })

  test('clamps the requested progress to [0, 1]', () => {
    const el = makeElement({ clientHeight: 100, scrollHeight: 300 })
    const target = ref(el)
    const setup = withSetup(() => useScrollMetrics(target))
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
    const target = ref(null)
    const setup = withSetup(() => useScrollMetrics(target))
    unmount = setup.unmount

    expect(setup.result.overflowing.value).toBe(false)
    expect(resize_instances).toHaveLength(0)

    const el = makeElement({ clientHeight: 100, scrollHeight: 300 })
    target.value = el
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(resize_instances).toHaveLength(1)
    expect(resize_instances[0].observed).toContain(el)
    expect(setup.result.overflowing.value).toBe(true)
  })

  test('detaches the previous element before attaching the new one', async () => {
    const first = makeElement({ clientHeight: 100, scrollHeight: 100 })
    const target = ref(first)
    const setup = withSetup(() => useScrollMetrics(target))
    unmount = setup.unmount

    const second = makeElement({ clientHeight: 100, scrollHeight: 300 })
    target.value = second
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(resize_instances[0].disconnected).toBe(true)
    expect(resize_instances[1].observed).toContain(second)
  })
})

// ── Page target ────────────────────────────────────────────────────────────────

describe('useScrollMetrics — page target', () => {
  test('resolving to "html" watches the window and document.body, not the element itself', () => {
    const target = ref('html')
    const addSpy = vi.spyOn(window, 'addEventListener')
    const setup = withSetup(() => useScrollMetrics(target))
    unmount = setup.unmount

    expect(addSpy).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true })
    expect(addSpy).toHaveBeenCalledWith('resize', expect.any(Function), { passive: true })
    expect(resize_instances).toHaveLength(0)
    expect(mutation_instances).toHaveLength(1)
    addSpy.mockRestore()
  })
})

// ── Cleanup on unmount ─────────────────────────────────────────────────────────

describe('useScrollMetrics — cleanup', () => {
  test('unmounting disconnects the resize and mutation observers', () => {
    const el = makeElement({ clientHeight: 100, scrollHeight: 300 })
    const target = ref(el)
    const setup = withSetup(() => useScrollMetrics(target))

    setup.unmount()

    expect(resize_instances[0].disconnected).toBe(true)
    expect(mutation_instances[0].disconnected).toBe(true)
  })

  test('unmounting a page-target instance removes the window listeners', () => {
    const target = ref('html')
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const setup = withSetup(() => useScrollMetrics(target))

    setup.unmount()

    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    removeSpy.mockRestore()
  })
})
