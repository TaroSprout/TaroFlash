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

  // Real on-screen keyboards never open without a focused editable surface —
  // most "is_open becomes true" scenarios need one present.
  let focused_input
  function focusInput() {
    focused_input = document.createElement('input')
    document.body.appendChild(focused_input)
    focused_input.focus()
  }

  afterEach(() => {
    focused_input?.remove()
    focused_input = undefined
  })

  test('is_open starts false when the viewport has not shrunk', () => {
    const { is_open } = useKeyboardOpen()
    expect(is_open.value).toBe(false)
  })

  test('is_open becomes true once the viewport shrinks past the threshold from its running max [obligation]', async () => {
    setCoarse(true)
    focusInput()
    const { is_open } = useKeyboardOpen()

    resize(500)
    vi.advanceTimersByTime(120)

    expect(is_open.value).toBe(true)
  })

  // ── hasEditableFocus gate [obligation] ──────────────────────────────────────
  // Mobile Chrome's own URL bar hides/reveals on scroll, shrinking the visual
  // viewport just like the keyboard does. Gating on an editable element having
  // focus tells the two apart — a real on-screen keyboard is never open
  // without a focused text surface.

  test('stays false on a coarse-pointer shrink past the threshold when nothing editable has focus [obligation]', () => {
    setCoarse(true)
    const { is_open } = useKeyboardOpen()

    resize(500)
    vi.advanceTimersByTime(120)

    expect(is_open.value).toBe(false)
  })

  test('becomes true on a coarse-pointer shrink past the threshold when an <input> has focus [obligation]', () => {
    setCoarse(true)
    focusInput()
    const { is_open } = useKeyboardOpen()

    resize(500)
    vi.advanceTimersByTime(120)

    expect(is_open.value).toBe(true)
  })

  test('becomes true when a contenteditable element has focus [obligation]', () => {
    setCoarse(true)
    // jsdom doesn't compute isContentEditable from the contenteditable
    // attribute, so stub document.activeElement directly with an element
    // that reports isContentEditable — mirroring the real DOM contract.
    const editable = document.createElement('div')
    Object.defineProperty(editable, 'isContentEditable', { value: true })
    Object.defineProperty(document, 'activeElement', {
      configurable: true,
      get: () => editable
    })

    const { is_open } = useKeyboardOpen()

    resize(500)
    vi.advanceTimersByTime(120)

    expect(is_open.value).toBe(true)

    delete document.activeElement
  })

  test('a burst of resize events debounces to a single settle after ~120ms [obligation]', () => {
    setCoarse(true)
    focusInput()
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
    focusInput()
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
    focusInput()
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
