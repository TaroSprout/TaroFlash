import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { createApp, ref } from 'vue'

const { makeTimeline, timelines, mockFromTo, mockTo, mockKillTweensOf, mockIsTweening, mockSet } =
  vi.hoisted(() => {
    const timelines = []
    function makeTimeline() {
      const state = { onComplete: null, calls: { to: [] } }
      const tl = {
        to: (...args) => {
          state.calls.to.push(args)
          return tl
        },
        fromTo: (...args) => {
          state.calls.to.push(args)
          return tl
        },
        call: () => tl,
        eventCallback: (_name, cb) => {
          state.onComplete = cb
          return tl
        },
        play: () => tl,
        progress: () => tl,
        kill: () => tl,
        state
      }
      timelines.push(tl)
      return tl
    }
    return {
      makeTimeline,
      timelines,
      mockFromTo: vi.fn(),
      mockTo: vi.fn(),
      mockKillTweensOf: vi.fn(),
      mockIsTweening: vi.fn(() => false),
      mockSet: vi.fn()
    }
  })

vi.mock('gsap', () => ({
  gsap: {
    fromTo: mockFromTo,
    to: mockTo,
    killTweensOf: mockKillTweensOf,
    timeline: () => makeTimeline(),
    isTweening: mockIsTweening,
    set: mockSet
  }
}))

const { mockUseMotionStore } = vi.hoisted(() => ({
  mockUseMotionStore: vi.fn(() => ({ factors: { duration: 1, height_tween_budget: 1 } }))
}))
vi.mock('@/stores/motion', () => ({ useMotionStore: mockUseMotionStore }))

import { dockSlideIn, dockSlideOut } from '@/utils/animations/dock-slide'
import { useStageHeight } from '@/components/layout-kit/stage/use-stage-height'

class FakeResizeObserver {
  constructor(cb) {
    this.cb = cb
    FakeResizeObserver.instances.push(this)
  }
  observe() {}
  disconnect() {}
}
FakeResizeObserver.instances = []

const el = document.createElement('div')
const done = vi.fn()

function makeBox(initial_height) {
  const box = { offsetHeight: initial_height, _natural: initial_height }
  let height_value = ''

  box.style = {
    overflow: '',
    get height() {
      return height_value
    },
    set height(v) {
      height_value = v
      if (v) box.offsetHeight = parseFloat(v)
    },
    removeProperty(prop) {
      if (prop === 'height') {
        height_value = ''
        box.offsetHeight = box._natural
      } else if (prop === 'overflow') {
        box.style.overflow = ''
      }
    }
  }

  return box
}

// Drives useStageHeight's real tween path (through the real motion driver, not a
// mock of it) so its duration can be read back from the timeline and compared
// against the slide's, rather than hard-coding 0.2 as the expectation in two
// unrelated files.
function heightTweenDuration() {
  vi.stubGlobal('ResizeObserver', FakeResizeObserver)
  FakeResizeObserver.instances.length = 0

  const box = ref(makeBox(40))
  const content = ref({ offsetHeight: 40 })
  const app = createApp({
    setup() {
      useStageHeight(box, content)
      return () => {}
    }
  })
  app.mount(document.createElement('div'))

  box.value._natural = 80
  content.value.offsetHeight = 80
  FakeResizeObserver.instances.at(-1).cb()

  const [, , vars] = timelines.at(-1).state.calls.to.at(-1)
  const duration = vars.duration

  app.unmount()
  vi.unstubAllGlobals()
  return duration
}

describe('dock-slide animations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    timelines.length = 0
    mockUseMotionStore.mockReturnValue({ factors: { duration: 1, height_tween_budget: 1 } })
  })

  describe('dockSlideIn', () => {
    test('tweens yPercent from 100 to 0', () => {
      dockSlideIn(el, done)

      expect(mockFromTo).toHaveBeenCalledWith(
        el,
        { yPercent: 100 },
        expect.objectContaining({ yPercent: 0 })
      )
    })

    test('uses a positive duration', () => {
      dockSlideIn(el, done)

      const opts = mockFromTo.mock.calls[0][2]
      expect(opts.duration).toBeGreaterThan(0)
    })

    test('calls done via onComplete', () => {
      dockSlideIn(el, done)

      const opts = mockFromTo.mock.calls[0][2]
      opts.onComplete()

      expect(done).toHaveBeenCalled()
    })

    test('clears the inline transform once settled', () => {
      dockSlideIn(el, done)

      const opts = mockFromTo.mock.calls[0][2]
      expect(opts.clearProps).toBe('transform')
    })

    test('does not call gsap.to', () => {
      dockSlideIn(el, done)

      expect(mockTo).not.toHaveBeenCalled()
    })
  })

  describe('dockSlideOut', () => {
    test('tweens yPercent to 100', () => {
      dockSlideOut(el, done)

      expect(mockTo).toHaveBeenCalledWith(el, expect.objectContaining({ yPercent: 100 }))
    })

    test('uses a positive duration', () => {
      dockSlideOut(el, done)

      const opts = mockTo.mock.calls[0][1]
      expect(opts.duration).toBeGreaterThan(0)
    })

    test('calls done via onComplete', () => {
      dockSlideOut(el, done)

      const opts = mockTo.mock.calls[0][1]
      opts.onComplete()

      expect(done).toHaveBeenCalled()
    })

    test('does not call gsap.fromTo', () => {
      dockSlideOut(el, done)

      expect(mockFromTo).not.toHaveBeenCalled()
    })
  })

  test('dockSlideIn and dockSlideOut share the same duration', () => {
    dockSlideIn(el, done)
    dockSlideOut(el, done)

    expect(mockFromTo.mock.calls[0][2].duration).toBe(mockTo.mock.calls[0][1].duration)
  })

  test("slide duration matches the dock content-height tween's duration", () => {
    dockSlideOut(el, done)
    const slide_duration = mockTo.mock.calls[0][1].duration

    vi.clearAllMocks()
    const height_duration = heightTweenDuration()

    expect(height_duration).toBe(slide_duration)
  })
})
