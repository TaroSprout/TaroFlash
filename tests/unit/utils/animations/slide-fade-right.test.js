import { describe, test, expect, beforeEach, afterEach, vi } from 'vite-plus/test'

const { mockFromTo, mockTo, mockSet, mockKillTweensOf } = vi.hoisted(() => ({
  mockFromTo: vi.fn(),
  mockTo: vi.fn(),
  mockSet: vi.fn(),
  mockKillTweensOf: vi.fn()
}))

vi.mock('gsap', () => ({
  gsap: { fromTo: mockFromTo, to: mockTo, set: mockSet, killTweensOf: mockKillTweensOf }
}))

import {
  slideFadeRightEnter,
  slideFadeRightLeave,
  tabSlideRightLeave,
  tabSlideRightEnter
} from '@/utils/animations/slide-fade-right'

const el = document.createElement('div')
const done = vi.fn()

function makeWrapper(offsetHeight = 400) {
  const w = document.createElement('div')
  Object.defineProperty(w, 'offsetHeight', { value: offsetHeight, configurable: true })
  return w
}

describe('slide-fade-right animations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('slideFadeRightEnter', () => {
    test('tweens from offset-right + opacity 0 to settled opacity 1', () => {
      slideFadeRightEnter(el, done)

      expect(mockFromTo).toHaveBeenCalledWith(
        el,
        expect.objectContaining({ opacity: 0, x: expect.any(Number) }),
        expect.objectContaining({ opacity: 1, x: 0 })
      )
    })

    test('starts from a positive x offset (slides leftward into place)', () => {
      slideFadeRightEnter(el, done)
      const from = mockFromTo.mock.calls[0][1]
      expect(from.x).toBeGreaterThan(0)
    })

    test('clears transform + rotate after the tween settles', () => {
      slideFadeRightEnter(el, done)
      const opts = mockFromTo.mock.calls[0][2]
      expect(opts.clearProps).toBe('transform,rotate')
    })

    test('forwards done via onComplete', () => {
      slideFadeRightEnter(el, done)
      const opts = mockFromTo.mock.calls[0][2]
      expect(opts.onComplete).toBe(done)
    })

    test('uses an ease-out curve', () => {
      slideFadeRightEnter(el, done)
      const opts = mockFromTo.mock.calls[0][2]
      expect(opts.ease).toMatch(/out/)
    })
  })

  describe('slideFadeRightLeave', () => {
    test('tweens to opacity 0 + positive x offset', () => {
      slideFadeRightLeave(el, done)

      expect(mockTo).toHaveBeenCalledWith(
        el,
        expect.objectContaining({ opacity: 0, x: expect.any(Number) })
      )
      const opts = mockTo.mock.calls[0][1]
      expect(opts.x).toBeGreaterThan(0)
    })

    test('forwards done via onComplete', () => {
      slideFadeRightLeave(el, done)
      const opts = mockTo.mock.calls[0][1]
      expect(opts.onComplete).toBe(done)
    })

    test('does not call gsap.fromTo', () => {
      slideFadeRightLeave(el, done)
      expect(mockFromTo).not.toHaveBeenCalled()
    })
  })

  test('both functions use a positive duration', () => {
    slideFadeRightEnter(el, done)
    slideFadeRightLeave(el, done)
    expect(mockFromTo.mock.calls[0][2].duration).toBeGreaterThan(0)
    expect(mockTo.mock.calls[0][1].duration).toBeGreaterThan(0)
  })
})

describe('tabSlideRightLeave', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('kills existing tweens on the wrapper before freezing height [obligation]', () => {
    const wrapper = makeWrapper(350)

    tabSlideRightLeave(wrapper)(el, vi.fn())

    expect(mockKillTweensOf).toHaveBeenCalledWith(wrapper)
  })

  test('resets wrapper height to empty string before freezing [obligation]', () => {
    const wrapper = makeWrapper(350)
    wrapper.style.height = '200px'

    tabSlideRightLeave(wrapper)(el, vi.fn())

    // End result: natural offsetHeight, not the stale mid-animation value
    expect(wrapper.style.height).toBe('350px')
  })

  test('freezes the wrapper height to its offsetHeight in px', () => {
    const wrapper = makeWrapper(350)

    tabSlideRightLeave(wrapper)(el, vi.fn())

    expect(wrapper.style.height).toBe('350px')
  })

  test('delegates the element slide-out to slideFadeRightLeave (calls gsap.to with x offset)', () => {
    const wrapper = makeWrapper()
    const d = vi.fn()

    tabSlideRightLeave(wrapper)(el, d)

    expect(mockTo).toHaveBeenCalledWith(
      el,
      expect.objectContaining({ opacity: 0, x: expect.any(Number) })
    )
    const opts = mockTo.mock.calls[0][1]
    expect(opts.x).toBeGreaterThan(0)
  })

  test('invokes done via the delegated leave onComplete', () => {
    const wrapper = makeWrapper()
    const d = vi.fn()

    tabSlideRightLeave(wrapper)(el, d)

    const opts = mockTo.mock.calls[0][1]
    expect(d).not.toHaveBeenCalled()
    opts.onComplete()
    expect(d).toHaveBeenCalledTimes(1)
  })
})

describe('tabSlideRightEnter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 0
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('hides the entering element at opacity 0 + x offset via gsap.set', () => {
    const wrapper = makeWrapper()

    tabSlideRightEnter(wrapper)(el, vi.fn())

    expect(mockSet).toHaveBeenCalledWith(
      el,
      expect.objectContaining({ opacity: 0, x: expect.any(Number) })
    )
    expect(mockSet.mock.calls[0][1].x).toBeGreaterThan(0)
  })

  test('kills existing tweens on the wrapper before rAF callback [obligation]', () => {
    const wrapper = makeWrapper()

    tabSlideRightEnter(wrapper)(el, vi.fn())

    expect(mockKillTweensOf).toHaveBeenCalledWith(wrapper)
  })

  test('releases wrapper to auto before measuring, then restores frozen height before tweening [obligation]', () => {
    const wrapper = makeWrapper(400)
    wrapper.style.height = '300px'

    tabSlideRightEnter(wrapper)(el, vi.fn())

    // After rAF: frozen=300 was read, height set to auto, target=400 measured,
    // then height restored to 300px for the tween start.
    expect(wrapper.style.height).toBe('300px')
    const wrapperCall = mockTo.mock.calls.find(([t]) => t === wrapper)
    expect(wrapperCall[1].height).toBe(400)
  })

  test('tweens the wrapper height to its natural offsetHeight', () => {
    const wrapper = makeWrapper(500)

    tabSlideRightEnter(wrapper)(el, vi.fn())

    const wrapperCall = mockTo.mock.calls.find(([t]) => t === wrapper)
    expect(wrapperCall).toBeTruthy()
    expect(wrapperCall[1]).toMatchObject({ height: 500 })
  })

  test('clears the wrapper inline height and invokes done when wrapper tween completes', () => {
    const wrapper = makeWrapper()
    wrapper.style.height = '300px'
    const d = vi.fn()

    tabSlideRightEnter(wrapper)(el, d)

    const wrapperOpts = mockTo.mock.calls.find(([t]) => t === wrapper)[1]
    expect(d).not.toHaveBeenCalled()
    wrapperOpts.onComplete()
    expect(wrapper.style.height).toBe('')
    expect(d).toHaveBeenCalledTimes(1)
  })

  test('slides the element in from the right and clears transform on completion', () => {
    const wrapper = makeWrapper()

    tabSlideRightEnter(wrapper)(el, vi.fn())

    const elCall = mockTo.mock.calls.find(([t]) => t === el)
    expect(elCall).toBeTruthy()
    expect(elCall[1]).toMatchObject({ opacity: 1, x: 0, clearProps: 'transform' })
  })

  test('uses a positive duration for both the wrapper and element tweens', () => {
    const wrapper = makeWrapper()

    tabSlideRightEnter(wrapper)(el, vi.fn())

    for (const [, opts] of mockTo.mock.calls) {
      expect(opts.duration).toBeGreaterThan(0)
    }
  })
})
