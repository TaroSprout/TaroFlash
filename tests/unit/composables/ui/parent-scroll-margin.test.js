import { describe, test, expect, beforeEach, afterEach, vi } from 'vite-plus/test'
import { createApp, ref } from 'vue'
import { useParentScrollMargin } from '@/composables/ui/parent-scroll-margin'

// ── Host-app helper ────────────────────────────────────────────────────────────
// Mounts a minimal Vue app so onMounted / onBeforeUnmount lifecycle hooks run.

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

// ── ResizeObserver fake ──────────────────────────────────────────────────────
// jsdom has no ResizeObserver. Capture the callback so a test can trigger a
// resize burst by hand.

let observed_callbacks
let disconnectSpy

class FakeResizeObserver {
  constructor(callback) {
    this.callback = callback
    observed_callbacks.push(callback)
  }
  observe() {}
  disconnect() {
    disconnectSpy()
  }
}

function fireBodyResize() {
  for (const cb of observed_callbacks) cb()
}

describe('useParentScrollMargin', () => {
  let parent
  let child
  let unmount
  let result

  beforeEach(() => {
    observed_callbacks = []
    disconnectSpy = vi.fn()
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
    vi.useFakeTimers()

    parent = document.createElement('div')
    child = document.createElement('div')
    parent.appendChild(child)
    document.body.appendChild(parent)

    // jsdom returns a zero rect by default — pin a distinguishable one so the
    // "measures the parent, not the element" assertion is meaningful.
    parent.getBoundingClientRect = () => ({ top: 100 })
    child.getBoundingClientRect = () => ({ top: 999 })
    Object.defineProperty(parent, 'clientWidth', { value: 640, configurable: true })
    Object.defineProperty(child, 'clientWidth', { value: 10, configurable: true })
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true })
  })

  afterEach(() => {
    unmount?.()
    unmount = undefined
    parent.remove()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  test("measures the element's parent, not the element itself", () => {
    const el = ref(child)
    ;({ result, unmount } = withSetup(() => useParentScrollMargin(el)))

    expect(result.scroll_margin.value).toBe(100)
    expect(result.container_width.value).toBe(640)
  })

  test('does nothing when the element has no parent element', () => {
    const detached = document.createElement('div')
    const el = ref(detached)
    ;({ result, unmount } = withSetup(() => useParentScrollMargin(el)))

    expect(result.measured.value).toBe(false)
  })

  test('measured flips true only after the first measurement', () => {
    const el = ref(child)
    ;({ result, unmount } = withSetup(() => useParentScrollMargin(el)))

    expect(result.measured.value).toBe(true)
  })

  test('a burst of body resizes yields exactly one measure, debounced 120ms', () => {
    const onMeasure = vi.fn()
    const el = ref(child)
    ;({ unmount } = withSetup(() => useParentScrollMargin(el, { onMeasure })))
    onMeasure.mockClear() // drop the initial onMounted measure call

    parent.getBoundingClientRect = () => ({ top: 200 })
    fireBodyResize()
    fireBodyResize()
    fireBodyResize()

    vi.advanceTimersByTime(119)
    expect(onMeasure).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(onMeasure).toHaveBeenCalledOnce()
  })

  test('runs onMeasure after each measurement, including the initial mount measure', () => {
    const onMeasure = vi.fn()
    const el = ref(child)
    ;({ unmount } = withSetup(() => useParentScrollMargin(el, { onMeasure })))

    expect(onMeasure).toHaveBeenCalledOnce()
  })

  test('unmount disconnects the resize observer and clears the pending debounce timer', () => {
    const onMeasure = vi.fn()
    const el = ref(child)
    ;({ unmount } = withSetup(() => useParentScrollMargin(el, { onMeasure })))
    onMeasure.mockClear()

    fireBodyResize()
    unmount()
    unmount = undefined

    vi.advanceTimersByTime(200)
    expect(onMeasure).not.toHaveBeenCalled()
    expect(disconnectSpy).toHaveBeenCalledOnce()
  })
})
