import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createApp } from 'vue'

function createMockVisualViewport(height, offsetTop = 0) {
  const handlers = { resize: new Set(), scroll: new Set() }
  return {
    height,
    offsetTop,
    addEventListener: vi.fn((type, cb) => handlers[type]?.add(cb)),
    removeEventListener: vi.fn((type, cb) => handlers[type]?.delete(cb)),
    _fire(type) {
      handlers[type]?.forEach((cb) => cb())
    },
    _handlerCount(type) {
      return handlers[type]?.size ?? 0
    }
  }
}

// useBottomChromeCover calls onScopeDispose, so every consumer needs a
// component/effect-scope host to unmount for teardown to run.
function mountConsumer(useBottomChromeCover) {
  let result
  const app = createApp({
    setup() {
      result = useBottomChromeCover()
      return () => null
    }
  })
  const el = document.createElement('div')
  app.mount(el)
  return {
    app,
    get is_covered() {
      return result.is_covered
    }
  }
}

describe('useBottomChromeCover', () => {
  let useBottomChromeCover
  let viewport
  let original_inner_height
  const apps = []

  beforeEach(async () => {
    vi.resetModules()
    vi.useFakeTimers()
    original_inner_height = window.innerHeight
    Object.defineProperty(window, 'innerHeight', {
      value: 800,
      writable: true,
      configurable: true
    })
    viewport = createMockVisualViewport(800)
    Object.defineProperty(window, 'visualViewport', {
      value: viewport,
      writable: true,
      configurable: true
    })
    ;({ useBottomChromeCover } = await import('@/composables/ui/safe-area'))
  })

  afterEach(() => {
    apps.splice(0).forEach((app) => app.unmount())
    vi.useRealTimers()
    Object.defineProperty(window, 'innerHeight', {
      value: original_inner_height,
      writable: true,
      configurable: true
    })
  })

  function consumer() {
    const c = mountConsumer(useBottomChromeCover)
    apps.push(c.app)
    return c
  }

  function fireResize() {
    viewport._fire('resize')
  }

  // ── Starting state ───────────────────────────────────────────

  test('is_covered defaults false, so a consumer that never gets a real measurement still errs toward extra room', () => {
    Object.defineProperty(window, 'visualViewport', {
      value: undefined,
      writable: true,
      configurable: true
    })

    const { is_covered } = consumer()

    expect(is_covered.value).toBe(false)
  })

  // ── Measurement on install ──────────────────────────────────────────────

  test('resolves is_covered to true once the initial measurement finds a gap over the threshold', () => {
    // innerHeight (800) - (viewport.height + offsetTop) = 800 - 700 = 100 > 10
    viewport.height = 700
    viewport.offsetTop = 0

    const { is_covered } = consumer()
    vi.runAllTimers()

    expect(is_covered.value).toBe(true)
  })

  test('resolves is_covered to false when the initial gap is at or under the threshold', () => {
    // 800 - (795 + 0) = 5 <= 10
    viewport.height = 795
    viewport.offsetTop = 0

    const { is_covered } = consumer()
    vi.runAllTimers()

    expect(is_covered.value).toBe(false)
  })

  test('accounts for visualViewport.offsetTop when computing the gap', () => {
    // 800 - (750 + 45) = 5 <= 10, even though height alone would read as a big gap
    viewport.height = 750
    viewport.offsetTop = 45

    const { is_covered } = consumer()
    vi.runAllTimers()

    expect(is_covered.value).toBe(false)
  })

  // ── Debounce + live updates ────────────────────────────────

  test('debounces a burst of resize events to a single re-measure after ~120ms', () => {
    viewport.height = 700 // large gap → covered once measured
    const { is_covered } = consumer()
    vi.runAllTimers()
    expect(is_covered.value).toBe(true)

    viewport.height = 795 // small gap → should become uncovered
    fireResize()
    vi.advanceTimersByTime(100)
    // Still within the debounce window
    expect(is_covered.value).toBe(true)

    vi.advanceTimersByTime(20)
    expect(is_covered.value).toBe(false)
  })

  test('re-measures on a scroll event too', () => {
    viewport.height = 700
    const { is_covered } = consumer()
    vi.runAllTimers()
    expect(is_covered.value).toBe(true)

    viewport.height = 795
    viewport._fire('scroll')
    vi.advanceTimersByTime(120)

    expect(is_covered.value).toBe(false)
  })

  // ── Consumer refcounting ────────────────────────────────────

  test('shares a single visualViewport listener pair across multiple consumers', () => {
    consumer()
    consumer()

    expect(viewport._handlerCount('resize')).toBe(1)
    expect(viewport._handlerCount('scroll')).toBe(1)
  })

  test('removes listeners only once the last consumer tears down', () => {
    const a = consumer()
    const b = consumer()

    a.app.unmount()
    apps.splice(apps.indexOf(a.app), 1)
    expect(viewport._handlerCount('resize')).toBe(1)

    b.app.unmount()
    apps.splice(apps.indexOf(b.app), 1)
    expect(viewport._handlerCount('resize')).toBe(0)
    expect(viewport._handlerCount('scroll')).toBe(0)
  })
})
