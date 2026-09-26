import { describe, test, expect, afterEach, beforeEach, vi } from 'vite-plus/test'
import { flushPromises } from '@vue/test-utils'
import { createApp, shallowRef } from 'vue'

const { mockFreezeMotionSafe, mockPrimeFreeze, mockScaleFreeze, mockSettleFreeze } = vi.hoisted(
  () => ({
    mockFreezeMotionSafe: vi.fn(() => true),
    mockPrimeFreeze: vi.fn(),
    mockScaleFreeze: vi.fn(),
    mockSettleFreeze: vi.fn(() => Promise.resolve())
  })
)

vi.mock('@/utils/animations/reader-freeze', () => ({
  freezeMotionSafe: mockFreezeMotionSafe,
  primeFreeze: mockPrimeFreeze,
  scaleFreeze: mockScaleFreeze,
  settleFreeze: mockSettleFreeze
}))

const { useResizeFreeze } = await import('@/views/reader/composables/resize-freeze')

class FakeResizeObserver {
  constructor(cb) {
    this.cb = cb
    this.disconnected = false
    FakeResizeObserver.instances.push(this)
  }
  observe() {}
  unobserve() {}
  disconnect() {
    this.disconnected = true
  }
}
FakeResizeObserver.instances = []

let app = null

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('ResizeObserver', FakeResizeObserver)
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((cb) => {
      cb()
      return 0
    })
  )
  FakeResizeObserver.instances = []
  mockFreezeMotionSafe.mockReturnValue(true)
})

afterEach(() => {
  app?.unmount()
  app = null
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

function makeEl(width, height) {
  const el = document.createElement('div')
  Object.defineProperty(el, 'clientWidth', { value: width, configurable: true })
  Object.defineProperty(el, 'clientHeight', { value: height, configurable: true })
  return el
}

function withResizeFreeze({ viewport_el, surface_el } = {}) {
  let result
  const viewport = shallowRef(viewport_el ?? makeEl(0, 0))
  const surface = shallowRef(surface_el ?? makeEl(0, 0))

  const host = createApp({
    setup() {
      result = useResizeFreeze({ viewport, surface })
      return () => null
    }
  })

  host.mount(document.createElement('div'))
  app = host

  return { ...result, viewport, surface }
}

describe('useResizeFreeze', () => {
  test('the first observation commits immediately without freezing', () => {
    const viewport_el = makeEl(500, 800)
    const { viewport_width, viewport_height, frozen } = withResizeFreeze({ viewport_el })

    FakeResizeObserver.instances.at(-1).cb()

    expect(viewport_width.value).toBe(500)
    expect(viewport_height.value).toBe(800)
    expect(frozen.value).toBe(false)
    expect(mockPrimeFreeze).not.toHaveBeenCalled()
  })

  test('is a no-op when dimensions are unchanged', () => {
    const viewport_el = makeEl(500, 800)
    const { viewport_width, frozen } = withResizeFreeze({ viewport_el })
    const observer = FakeResizeObserver.instances.at(-1)

    observer.cb()
    observer.cb()

    expect(viewport_width.value).toBe(500)
    expect(frozen.value).toBe(false)
    expect(mockPrimeFreeze).not.toHaveBeenCalled()
  })

  test('a height change commits live immediately, never freezing', () => {
    const viewport_el = makeEl(500, 800)
    const { viewport_width, viewport_height, frozen } = withResizeFreeze({ viewport_el })
    const observer = FakeResizeObserver.instances.at(-1)

    observer.cb()

    Object.defineProperty(viewport_el, 'clientHeight', { value: 900, configurable: true })
    observer.cb()

    expect(viewport_width.value).toBe(500)
    expect(viewport_height.value).toBe(900)
    expect(frozen.value).toBe(false)
    expect(mockPrimeFreeze).not.toHaveBeenCalled()
  })

  describe('a single width-only event', () => {
    test('commits live after the drag window, without freezing', () => {
      const viewport_el = makeEl(500, 800)
      const { viewport_width, frozen } = withResizeFreeze({ viewport_el })
      const observer = FakeResizeObserver.instances.at(-1)

      observer.cb()

      Object.defineProperty(viewport_el, 'clientWidth', { value: 600, configurable: true })
      observer.cb()

      expect(frozen.value).toBe(false)
      expect(viewport_width.value).toBe(500)

      vi.advanceTimersByTime(150)

      expect(frozen.value).toBe(false)
      expect(viewport_width.value).toBe(600)
      expect(mockPrimeFreeze).not.toHaveBeenCalled()
    })
  })

  describe('two or more successive width-only events', () => {
    test('freezes on the second event within the drag window, then settles', async () => {
      const viewport_el = makeEl(500, 800)
      const { viewport_width, frozen } = withResizeFreeze({ viewport_el })
      const observer = FakeResizeObserver.instances.at(-1)

      observer.cb()

      Object.defineProperty(viewport_el, 'clientWidth', { value: 600, configurable: true })
      observer.cb()
      expect(frozen.value).toBe(false)

      Object.defineProperty(viewport_el, 'clientWidth', { value: 650, configurable: true })
      observer.cb()

      expect(frozen.value).toBe(true)
      expect(mockPrimeFreeze).toHaveBeenCalledOnce()

      vi.advanceTimersByTime(300)
      await flushPromises()

      expect(frozen.value).toBe(false)
      expect(viewport_width.value).toBe(650)
      expect(mockSettleFreeze).toHaveBeenCalledOnce()
    })

    test('a further width-only event while frozen holds the frame and re-settles', async () => {
      const viewport_el = makeEl(500, 800)
      const { viewport_width } = withResizeFreeze({ viewport_el })
      const observer = FakeResizeObserver.instances.at(-1)

      observer.cb()
      Object.defineProperty(viewport_el, 'clientWidth', { value: 600, configurable: true })
      observer.cb()
      Object.defineProperty(viewport_el, 'clientWidth', { value: 650, configurable: true })
      observer.cb()

      Object.defineProperty(viewport_el, 'clientWidth', { value: 700, configurable: true })
      observer.cb()

      vi.advanceTimersByTime(300)
      await flushPromises()

      expect(viewport_width.value).toBe(700)
      expect(mockSettleFreeze).toHaveBeenCalledOnce()
    })
  })

  describe('reduced motion', () => {
    test('a width-drag still toggles frozen, but calls no blur helpers', async () => {
      mockFreezeMotionSafe.mockReturnValue(false)

      const viewport_el = makeEl(500, 800)
      const { frozen } = withResizeFreeze({ viewport_el })
      const observer = FakeResizeObserver.instances.at(-1)

      observer.cb()
      Object.defineProperty(viewport_el, 'clientWidth', { value: 600, configurable: true })
      observer.cb()
      Object.defineProperty(viewport_el, 'clientWidth', { value: 650, configurable: true })
      observer.cb()

      expect(frozen.value).toBe(true)
      expect(mockPrimeFreeze).not.toHaveBeenCalled()
      expect(mockScaleFreeze).not.toHaveBeenCalled()

      vi.advanceTimersByTime(300)
      await flushPromises()

      expect(frozen.value).toBe(false)
      expect(mockSettleFreeze).not.toHaveBeenCalled()
    })
  })

  test('disconnects the observer and clears the pending timer on unmount', () => {
    const viewport_el = makeEl(500, 800)
    withResizeFreeze({ viewport_el })
    const observer = FakeResizeObserver.instances.at(-1)

    observer.cb()
    Object.defineProperty(viewport_el, 'clientWidth', { value: 600, configurable: true })
    observer.cb()
    Object.defineProperty(viewport_el, 'clientWidth', { value: 650, configurable: true })
    observer.cb()

    app.unmount()
    app = null

    expect(observer.disconnected).toBe(true)
    expect(() => vi.advanceTimersByTime(1000)).not.toThrow()
  })
})
