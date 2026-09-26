import { describe, test, expect, afterEach, beforeEach, vi } from 'vite-plus/test'
import { computed, createApp, nextTick, ref, shallowRef } from 'vue'

const { mockMeasure, mockSlideScroller, mockUseMotionStore } = vi.hoisted(() => ({
  mockMeasure: vi.fn(),
  mockSlideScroller: vi.fn(),
  mockUseMotionStore: vi.fn()
}))

vi.mock('@tanstack/vue-virtual', () => ({
  useVirtualizer: () => computed(() => ({ measure: mockMeasure }))
}))
vi.mock('@/stores/motion', () => ({ useMotionStore: mockUseMotionStore }))
vi.mock('@/utils/animations/page-strip', () => ({ slideScroller: mockSlideScroller }))

const { usePageStrip } = await import('@/views/reader/composables/page-strip')

let app = null

beforeEach(() => {
  vi.useFakeTimers()
  mockUseMotionStore.mockReturnValue({ prefers_reduced_motion: false })
  mockSlideScroller.mockImplementation((_el, _to, onDone) => onDone())
})

afterEach(() => {
  app?.unmount()
  app = null
  vi.useRealTimers()
  vi.clearAllMocks()
})

function makeScroller(scrollLeft = 0) {
  const el = document.createElement('div')
  Object.defineProperty(el, 'scrollLeft', {
    value: scrollLeft,
    writable: true,
    configurable: true
  })
  el.style.scrollSnapType = ''
  return el
}

function withPageStrip({
  scroller_el,
  spread_count = 3,
  item_size = 300,
  desired_spread,
  anchor_spread,
  onTurn = vi.fn()
} = {}) {
  let result
  const scroller = shallowRef(scroller_el ?? makeScroller())
  const desired = desired_spread ?? ref(0)
  const anchor = anchor_spread ?? ref(0)

  const host = createApp({
    setup() {
      result = usePageStrip({
        scroller,
        spread_count: () => spread_count,
        item_size: () => item_size,
        desired_spread: () => desired.value,
        anchor_spread: () => anchor.value,
        onTurn
      })
      return () => null
    }
  })

  host.mount(document.createElement('div'))
  app = host

  vi.advanceTimersByTime(20)

  return { ...result, scroller, desired, anchor, onTurn }
}

describe('usePageStrip', () => {
  describe('commitScroll', () => {
    test('re-arms the idle timer instead of committing on a misaligned settle', () => {
      const el = makeScroller()
      const { onTurn, displayed_spread } = withPageStrip({ scroller_el: el })

      el.scrollLeft = 100
      el.dispatchEvent(new Event('scroll'))
      vi.advanceTimersByTime(80)

      expect(onTurn).not.toHaveBeenCalled()
      expect(displayed_spread.value).toBe(0)

      vi.advanceTimersByTime(80)
      expect(onTurn).not.toHaveBeenCalled()
    })

    test('commits on an aligned settle to a new slot — updates displayed_spread and fires onTurn', () => {
      const el = makeScroller()
      const { onTurn, displayed_spread } = withPageStrip({ scroller_el: el })

      el.scrollLeft = 300
      el.dispatchEvent(new Event('scroll'))
      vi.advanceTimersByTime(80)

      expect(displayed_spread.value).toBe(1)
      expect(onTurn).toHaveBeenCalledWith(1)
    })

    test('an aligned settle to the SAME slot does not fire onTurn', () => {
      const el = makeScroller(0)
      const { onTurn, displayed_spread } = withPageStrip({ scroller_el: el })

      el.dispatchEvent(new Event('scroll'))
      vi.advanceTimersByTime(80)

      expect(displayed_spread.value).toBe(0)
      expect(onTurn).not.toHaveBeenCalled()
    })
  })

  describe('clampSpread', () => {
    test('desired_spread past the last page clamps to spread_count - 1', async () => {
      const desired = ref(0)
      const { displayed_spread, scroller } = withPageStrip({
        spread_count: 3,
        desired_spread: desired
      })

      desired.value = 10
      await nextTick()

      expect(displayed_spread.value).toBe(2)
      expect(scroller.value.scrollLeft).toBe(2 * 300)
    })

    test('desired_spread below 0 clamps to 0', async () => {
      const desired = ref(1)
      const { displayed_spread } = withPageStrip({ spread_count: 3, desired_spread: desired })

      desired.value = -5
      await nextTick()

      expect(displayed_spread.value).toBe(0)
    })
  })

  describe('goTo — reduced motion / multi-step jumps use jumpTo, not slide', () => {
    test('a multi-step jump sets scrollLeft directly without slideScroller', async () => {
      const desired = ref(0)
      const { displayed_spread, scroller } = withPageStrip({
        spread_count: 5,
        desired_spread: desired
      })

      desired.value = 3
      await nextTick()

      expect(mockSlideScroller).not.toHaveBeenCalled()
      expect(displayed_spread.value).toBe(3)
      expect(scroller.value.scrollLeft).toBe(3 * 300)
    })

    test('reduced motion uses jumpTo even for a single-step move', async () => {
      mockUseMotionStore.mockReturnValue({ prefers_reduced_motion: true })
      const desired = ref(0)
      const { displayed_spread } = withPageStrip({ spread_count: 3, desired_spread: desired })

      desired.value = 1
      await nextTick()

      expect(mockSlideScroller).not.toHaveBeenCalled()
      expect(displayed_spread.value).toBe(1)
    })
  })

  describe('goTo — a single-step move under full motion slides', () => {
    test('calls slideScroller and updates displayed_spread once it settles', async () => {
      const desired = ref(0)
      const { displayed_spread } = withPageStrip({ spread_count: 3, desired_spread: desired })

      desired.value = 1
      await nextTick()

      expect(mockSlideScroller).toHaveBeenCalledOnce()
      expect(displayed_spread.value).toBe(1)
    })
  })

  describe('compensatePrepend', () => {
    test('shifts displayed_spread and the scroll offset by the prepended delta when idle', async () => {
      const desired = ref(0)
      const anchor = ref(0)
      const el = makeScroller(300)
      const { displayed_spread, scroller } = withPageStrip({
        scroller_el: el,
        spread_count: 5,
        item_size: 300,
        desired_spread: desired,
        anchor_spread: anchor
      })

      desired.value = 1
      await nextTick()
      expect(displayed_spread.value).toBe(1)

      anchor.value = 2
      await nextTick()

      expect(displayed_spread.value).toBe(3)
      expect(scroller.value.scrollLeft).toBe(2 * 300)
    })

    test('re-aims the in-flight slide target when a spread is prepended mid-slide', async () => {
      let capturedOnDone
      mockSlideScroller.mockImplementation((_el, _to, onDone) => {
        capturedOnDone = onDone
        return vi.fn()
      })

      const desired = ref(0)
      const anchor = ref(0)
      const el = makeScroller(0)
      withPageStrip({
        scroller_el: el,
        spread_count: 5,
        item_size: 300,
        desired_spread: desired,
        anchor_spread: anchor
      })

      desired.value = 1
      await nextTick()
      expect(mockSlideScroller).toHaveBeenCalledOnce()

      anchor.value = 1
      await nextTick()

      expect(mockSlideScroller).toHaveBeenCalledTimes(2)
      const [, to] = mockSlideScroller.mock.calls[1]
      expect(to).toBe(2 * 300)

      capturedOnDone()
    })
  })
})
