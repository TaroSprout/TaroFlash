import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { createApp, ref } from 'vue'
import { useAnimatedHeight } from '@/composables/ui/animated-height'

const { mockFromTo, mockTo, mockKillTweensOf } = vi.hoisted(() => ({
  mockFromTo: vi.fn(),
  mockTo: vi.fn(),
  mockKillTweensOf: vi.fn()
}))

vi.mock('gsap', () => ({
  gsap: { fromTo: mockFromTo, to: mockTo, killTweensOf: mockKillTweensOf }
}))

import { dockSlideIn, dockSlideOut } from '@/utils/animations/dock-slide'

const el = document.createElement('div')
const done = vi.fn()

// Drives useAnimatedHeight's own gsap.to call (shared 'gsap' mock above) so its
// real duration can be read back and compared against the slide's, rather than
// hard-coding 0.2 as the expectation in two unrelated test files.
function heightTweenDuration() {
  let observer_cb
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(cb) {
        observer_cb = cb
      }
      observe() {}
      disconnect() {}
    }
  )

  const wrapper = ref({ offsetHeight: 0, style: {} })
  const content = ref({ offsetHeight: 0, style: {} })
  const app = createApp({
    setup() {
      useAnimatedHeight(wrapper, content, () => true, undefined, true)
      return () => {}
    }
  })
  app.mount(document.createElement('div'))

  content.value.offsetHeight = 50
  observer_cb()

  const duration = mockTo.mock.calls.at(-1)[1].duration
  app.unmount()
  vi.unstubAllGlobals()
  return duration
}

describe('dock-slide animations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

  test("slide duration matches the dock content-height tween's duration [obligation]", () => {
    dockSlideOut(el, done)
    const slide_duration = mockTo.mock.calls[0][1].duration

    vi.clearAllMocks()
    const height_duration = heightTweenDuration()

    expect(height_duration).toBe(slide_duration)
  })
})
