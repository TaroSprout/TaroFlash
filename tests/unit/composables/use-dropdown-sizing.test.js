import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { ref, nextTick, createApp } from 'vue'

// ── ResizeObserver stub ───────────────────────────────────────────────────────
// jsdom does not implement ResizeObserver. We need a stub that:
//  - records observed elements
//  - exposes a way to trigger callbacks from tests
//  - records disconnect() calls

let resizeCallback = null
let observedElements = []
let disconnectCalled = false

class ResizeObserverStub {
  constructor(cb) {
    resizeCallback = cb
  }
  observe(el) {
    observedElements.push(el)
  }
  disconnect() {
    disconnectCalled = true
  }
}

// Stub document.fonts?.ready.then(...) — jsdom has no FontFaceSet.
// The source reads `document.fonts?.ready.then(measure)`, so the stub must
// expose a `.ready` object with a `.then` method.
const mockFontsReady = { ready: { then: vi.fn((cb) => cb()) } }

// ── Host-app helper (composable needs onMounted / onBeforeUnmount) ─────────────

function withSetup(composable) {
  let result
  let app
  const el = document.createElement('div')

  app = createApp({
    setup() {
      result = composable()
      return () => {}
    }
  })
  app.mount(el)

  return { result, unmount: () => app.unmount() }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

import { useDropdownSizing } from '@/components/ui-kit/dropdown-button/use-dropdown-sizing'

describe('useDropdownSizing', () => {
  beforeEach(() => {
    resizeCallback = null
    observedElements = []
    disconnectCalled = false

    vi.stubGlobal('ResizeObserver', ResizeObserverStub)
    Object.defineProperty(document, 'fonts', {
      value: mockFontsReady,
      writable: true,
      configurable: true
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ── Return shape ───────────────────────────────────────────────────────────

  test('returns triggerRef, sizerRef, min_width, trigger_width', () => {
    const { result, unmount } = withSetup(() => useDropdownSizing(() => []))
    expect(result).toHaveProperty('triggerRef')
    expect(result).toHaveProperty('sizerRef')
    expect(result).toHaveProperty('min_width')
    expect(result).toHaveProperty('trigger_width')
    unmount()
  })

  test('min_width and trigger_width start at 0', () => {
    const { result, unmount } = withSetup(() => useDropdownSizing(() => []))
    expect(result.min_width.value).toBe(0)
    expect(result.trigger_width.value).toBe(0)
    unmount()
  })

  // ── measure() reads sizerRef and triggerRef.$el widths ────────────────────

  test('measure() reads sizerRef getBoundingClientRect().width into min_width [obligation]', () => {
    const { result, unmount } = withSetup(() => useDropdownSizing(() => []))

    const sizerEl = document.createElement('div')
    sizerEl.getBoundingClientRect = () => ({ width: 123.4 })
    result.sizerRef.value = sizerEl

    // Trigger measure via ResizeObserver callback
    resizeCallback([])

    expect(result.min_width.value).toBe(124) // Math.ceil(123.4)
    unmount()
  })

  test('measure() reads triggerRef.$el getBoundingClientRect().width into trigger_width [obligation]', () => {
    const { result, unmount } = withSetup(() => useDropdownSizing(() => []))

    const triggerEl = document.createElement('button')
    triggerEl.getBoundingClientRect = () => ({ width: 200.7 })
    result.triggerRef.value = { $el: triggerEl }

    resizeCallback([])

    expect(result.trigger_width.value).toBe(201) // Math.ceil(200.7)
    unmount()
  })

  test('measure() skips min_width update when sizerRef is null', () => {
    const { result, unmount } = withSetup(() => useDropdownSizing(() => []))
    result.sizerRef.value = null

    resizeCallback([])

    expect(result.min_width.value).toBe(0)
    unmount()
  })

  test('measure() skips trigger_width update when triggerRef.$el is null', () => {
    const { result, unmount } = withSetup(() => useDropdownSizing(() => []))
    result.triggerRef.value = null

    resizeCallback([])

    expect(result.trigger_width.value).toBe(0)
    unmount()
  })

  // ── ResizeObserver wiring ──────────────────────────────────────────────────

  test('observes sizerRef element on mount [obligation]', () => {
    const { result, unmount } = withSetup(() => useDropdownSizing(() => []))

    const sizerEl = document.createElement('div')
    sizerEl.getBoundingClientRect = () => ({ width: 0 })
    result.sizerRef.value = sizerEl

    // The observer is created on mount — we verify it was set up by checking
    // that resizeCallback was assigned (meaning new ResizeObserver was called).
    expect(resizeCallback).not.toBeNull()
    unmount()
  })

  test('disconnects the ResizeObserver on unmount [obligation]', () => {
    const { unmount } = withSetup(() => useDropdownSizing(() => []))
    expect(disconnectCalled).toBe(false)
    unmount()
    expect(disconnectCalled).toBe(true)
  })

  // ── Deps watcher re-measures ───────────────────────────────────────────────

  test('re-measures when the deps getter changes [obligation]', async () => {
    const options = ref([{ label: 'A', value: 'a' }])

    const { result, unmount } = withSetup(() => useDropdownSizing(() => options.value))

    const sizerEl = document.createElement('div')
    sizerEl.getBoundingClientRect = () => ({ width: 50 })
    result.sizerRef.value = sizerEl

    // Trigger initial read
    resizeCallback([])
    expect(result.min_width.value).toBe(50)

    // Change options — width increases
    sizerEl.getBoundingClientRect = () => ({ width: 100 })
    options.value = [{ label: 'Longer Option', value: 'b' }]
    await nextTick()
    await nextTick() // flush: 'post' watcher needs an extra tick

    expect(result.min_width.value).toBe(100)
    unmount()
  })

  // ── document.fonts.ready ───────────────────────────────────────────────────

  test('calls measure after document.fonts.ready resolves [obligation]', () => {
    let fontsReadyCb = null
    const readyMock = {
      then: vi.fn((cb) => {
        fontsReadyCb = cb
      })
    }
    const fontsMock = { ready: readyMock }
    Object.defineProperty(document, 'fonts', {
      value: fontsMock,
      writable: true,
      configurable: true
    })

    const { result, unmount } = withSetup(() => useDropdownSizing(() => []))

    const sizerEl = document.createElement('div')
    sizerEl.getBoundingClientRect = () => ({ width: 77 })
    result.sizerRef.value = sizerEl

    expect(readyMock.then).toHaveBeenCalled()

    // Simulate fonts ready resolving
    fontsReadyCb()

    expect(result.min_width.value).toBe(77)
    unmount()
  })
})
