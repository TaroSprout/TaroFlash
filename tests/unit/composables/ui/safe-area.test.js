import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'

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

describe('installSafeAreaPadding', () => {
  let installSafeAreaPadding
  let viewport
  let original_inner_height

  beforeEach(async () => {
    vi.resetModules()
    vi.useFakeTimers()
    global.__matchMedia.matches = false
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
    document.documentElement.style.removeProperty('--edge-safe-padding')
    ;({ installSafeAreaPadding } = await import('@/composables/ui/safe-area'))
  })

  afterEach(() => {
    vi.useRealTimers()
    Object.defineProperty(window, 'innerHeight', {
      value: original_inner_height,
      writable: true,
      configurable: true
    })
    document.documentElement.style.removeProperty('--edge-safe-padding')
  })

  function paddingVar() {
    return document.documentElement.style.getPropertyValue('--edge-safe-padding')
  }

  function fireResize() {
    viewport._fire('resize')
  }

  function setCoarse(is_coarse) {
    global.__matchMedia.matches = is_coarse
    global.__matchMedia.listeners.forEach((listener) => listener())
  }

  // ── Non-coarse pointer (desktop) [obligation] ─────────────────────────────

  test('resolves to 0px on install for a non-coarse (fine) pointer, regardless of any viewport gap [obligation]', () => {
    global.__matchMedia.matches = false
    // Even a large chrome gap must not matter on a fine pointer.
    viewport.height = 700
    viewport.offsetTop = 0

    installSafeAreaPadding()

    expect(paddingVar()).toBe('0px')
  })

  // ── Coarse pointer: chrome docked vs not [obligation] ─────────────────────

  test('resolves to 0px when the chrome gap exceeds the threshold on a coarse pointer [obligation]', () => {
    setCoarse(true)
    // innerHeight (800) - (viewport.height + offsetTop) = 800 - 700 = 100 > 10
    viewport.height = 700
    viewport.offsetTop = 0

    installSafeAreaPadding()

    expect(paddingVar()).toBe('0px')
  })

  test('resolves to env(safe-area-inset-bottom) when the chrome gap is small on a coarse pointer [obligation]', () => {
    setCoarse(true)
    // 800 - (795 + 0) = 5 <= 10
    viewport.height = 795
    viewport.offsetTop = 0

    installSafeAreaPadding()

    expect(paddingVar()).toBe('env(safe-area-inset-bottom)')
  })

  test('accounts for visualViewport.offsetTop when computing the gap [obligation]', () => {
    setCoarse(true)
    // 800 - (750 + 45) = 5 <= 10, even though height alone would read as a big gap
    viewport.height = 750
    viewport.offsetTop = 45

    installSafeAreaPadding()

    expect(paddingVar()).toBe('env(safe-area-inset-bottom)')
  })

  // ── No visualViewport ──────────────────────────────────────────────────────

  test('resolves to 0px when window.visualViewport is unavailable', () => {
    setCoarse(true)
    Object.defineProperty(window, 'visualViewport', {
      value: undefined,
      writable: true,
      configurable: true
    })

    installSafeAreaPadding()

    expect(paddingVar()).toBe('0px')
  })

  // ── Debounce + live updates ────────────────────────────────────────────────

  test('debounces a burst of resize events to a single re-measure after DEBOUNCE_MS', () => {
    setCoarse(true)
    viewport.height = 700 // large gap → 0px initially
    installSafeAreaPadding()
    expect(paddingVar()).toBe('0px')

    viewport.height = 795 // small gap → should become env(...)
    fireResize()
    vi.advanceTimersByTime(100)
    // Still within the debounce window
    expect(paddingVar()).toBe('0px')

    vi.advanceTimersByTime(20)
    expect(paddingVar()).toBe('env(safe-area-inset-bottom)')
  })

  test('re-measures on a scroll event too', () => {
    setCoarse(true)
    viewport.height = 700
    installSafeAreaPadding()
    expect(paddingVar()).toBe('0px')

    viewport.height = 795
    viewport._fire('scroll')
    vi.advanceTimersByTime(120)

    expect(paddingVar()).toBe('env(safe-area-inset-bottom)')
  })

  test('re-measures when the pointer type flips from fine to coarse', async () => {
    global.__matchMedia.matches = false
    viewport.height = 795 // would be env(...) on coarse, but fine pointer forces 0px

    installSafeAreaPadding()
    expect(paddingVar()).toBe('0px')

    setCoarse(true)
    await Promise.resolve()

    expect(paddingVar()).toBe('env(safe-area-inset-bottom)')
  })

  // ── Consumer refcounting ────────────────────────────────────────────────────

  test('shares a single visualViewport listener pair across multiple installs', () => {
    installSafeAreaPadding()
    installSafeAreaPadding()

    expect(viewport._handlerCount('resize')).toBe(1)
    expect(viewport._handlerCount('scroll')).toBe(1)
  })

  test('removes listeners only once the last consumer tears down', () => {
    const teardownA = installSafeAreaPadding()
    const teardownB = installSafeAreaPadding()

    teardownA()
    expect(viewport._handlerCount('resize')).toBe(1)

    teardownB()
    expect(viewport._handlerCount('resize')).toBe(0)
    expect(viewport._handlerCount('scroll')).toBe(0)
  })

  test('a second consumer does not re-measure — the value from the first install stands', () => {
    setCoarse(true)
    viewport.height = 700
    installSafeAreaPadding()
    expect(paddingVar()).toBe('0px')

    document.documentElement.style.setProperty('--edge-safe-padding', 'sentinel')
    installSafeAreaPadding()

    expect(paddingVar()).toBe('sentinel')
  })
})
