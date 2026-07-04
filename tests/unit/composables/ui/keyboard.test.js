import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { effectScope, nextTick } from 'vue'

function createMockVisualViewport(height) {
  const handlers = new Set()
  return {
    height,
    addEventListener: vi.fn((_, cb) => handlers.add(cb)),
    removeEventListener: vi.fn((_, cb) => handlers.delete(cb)),
    _fire() {
      handlers.forEach((cb) => cb())
    },
    _handlerCount() {
      return handlers.size
    }
  }
}

describe('useKeyboardOpen', () => {
  let useKeyboardOpen
  let viewport

  beforeEach(async () => {
    vi.resetModules()
    vi.useFakeTimers()
    global.__matchMedia.matches = false
    viewport = createMockVisualViewport(800)
    Object.defineProperty(window, 'visualViewport', {
      value: viewport,
      writable: true,
      configurable: true
    })
    ;({ useKeyboardOpen } = await import('@/composables/ui/keyboard'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function resize(height) {
    viewport.height = height
    viewport._fire()
  }

  function firePointerChange() {
    global.__matchMedia.listeners.forEach((listener) => listener())
  }

  function setCoarse(is_coarse) {
    global.__matchMedia.matches = is_coarse
    firePointerChange()
  }

  test('is_open starts false when the viewport has not shrunk', () => {
    const { is_open } = useKeyboardOpen()
    expect(is_open.value).toBe(false)
  })

  test('is_open becomes true once the viewport shrinks past the threshold from its running max [obligation]', async () => {
    setCoarse(true)
    const { is_open } = useKeyboardOpen()

    resize(500)
    vi.advanceTimersByTime(120)

    expect(is_open.value).toBe(true)
  })

  test('a burst of resize events debounces to a single settle after ~120ms [obligation]', () => {
    setCoarse(true)
    const { is_open } = useKeyboardOpen()

    resize(700)
    vi.advanceTimersByTime(50)
    resize(650)
    vi.advanceTimersByTime(50)
    resize(500)
    // Still within the debounce window of the last event
    vi.advanceTimersByTime(100)
    expect(is_open.value).toBe(false)

    vi.advanceTimersByTime(20)
    expect(is_open.value).toBe(true)
  })

  test('running max keeps growing so a later, larger viewport height raises the baseline [obligation]', () => {
    setCoarse(true)
    const { is_open } = useKeyboardOpen()

    // Viewport grows (e.g. mobile Safari toolbar hides) — new running max.
    resize(900)
    vi.advanceTimersByTime(120)
    expect(is_open.value).toBe(false)

    // A shrink relative to the OLD max (800) would have crossed the threshold,
    // but relative to the new running max (900) it now also counts as open.
    resize(750)
    vi.advanceTimersByTime(120)
    expect(is_open.value).toBe(true)
  })

  test('a shrink within the threshold does not open', () => {
    setCoarse(true)
    const { is_open } = useKeyboardOpen()

    resize(750)
    vi.advanceTimersByTime(120)

    expect(is_open.value).toBe(false)
  })

  test('a fine pointer (desktop) shrinking the viewport does not set is_open true [obligation]', () => {
    const { is_open } = useKeyboardOpen()

    resize(500)
    vi.advanceTimersByTime(120)

    expect(is_open.value).toBe(false)
  })

  test('re-evaluates on a pointer-type change without a new resize event [obligation]', async () => {
    setCoarse(true)
    const { is_open } = useKeyboardOpen()

    resize(500)
    vi.advanceTimersByTime(120)
    expect(is_open.value).toBe(true)

    setCoarse(false)
    await nextTick()

    expect(is_open.value).toBe(false)
  })

  test('shares a single visualViewport listener across multiple consumers', () => {
    useKeyboardOpen()
    useKeyboardOpen()

    expect(viewport.addEventListener).toHaveBeenCalledTimes(1)
  })

  test('removes the listener only once the last consumer disposes', () => {
    const scopeA = effectScope()
    const scopeB = effectScope()

    scopeA.run(() => useKeyboardOpen())
    scopeB.run(() => useKeyboardOpen())

    scopeA.stop()
    expect(viewport.removeEventListener).not.toHaveBeenCalled()

    scopeB.stop()
    expect(viewport.removeEventListener).toHaveBeenCalledTimes(1)
  })

  test('does nothing when visualViewport is unavailable', async () => {
    vi.resetModules()
    Object.defineProperty(window, 'visualViewport', {
      value: undefined,
      writable: true,
      configurable: true
    })
    const { useKeyboardOpen: useKeyboardOpenNoViewport } = await import('@/composables/ui/keyboard')

    expect(() => useKeyboardOpenNoViewport()).not.toThrow()
  })
})
