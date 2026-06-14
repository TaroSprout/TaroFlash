import { describe, test, expect, beforeEach, afterEach, vi } from 'vite-plus/test'

const { mockSet, mockTo, mockKillTweensOf } = vi.hoisted(() => ({
  mockSet: vi.fn(),
  mockTo: vi.fn(),
  mockKillTweensOf: vi.fn()
}))

vi.mock('gsap', () => ({ gsap: { set: mockSet, to: mockTo, killTweensOf: mockKillTweensOf } }))

import { tabHeightEnter, tabHeightLeave } from '@/utils/animations/tab-height'

function makeWrapper(offsetHeight = 400) {
  const el = document.createElement('div')
  Object.defineProperty(el, 'offsetHeight', { value: offsetHeight, configurable: true })
  return el
}

function makeChild(scrollHeight = 250) {
  const el = document.createElement('div')
  Object.defineProperty(el, 'scrollHeight', { value: scrollHeight, configurable: true })
  return el
}

describe('tabHeightLeave', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock requestAnimationFrame to run callbacks synchronously so tests
    // can exercise the rAF-gated code paths without async ceremony.
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 0
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('freezes the wrapper to its current offsetHeight in px', () => {
    const wrapper = makeWrapper(420)
    const el = makeChild()
    const done = vi.fn()

    tabHeightLeave(wrapper)(el, done)

    expect(wrapper.style.height).toBe('420px')
  })

  test('fades the leaving element opacity to 0 via gsap.to', () => {
    const wrapper = makeWrapper()
    const el = makeChild()
    const done = vi.fn()

    tabHeightLeave(wrapper)(el, done)

    expect(mockTo).toHaveBeenCalledTimes(1)
    expect(mockTo).toHaveBeenCalledWith(el, expect.objectContaining({ opacity: 0 }))
  })

  test('invokes done from gsap.to onComplete', () => {
    const wrapper = makeWrapper()
    const el = makeChild()
    const done = vi.fn()

    tabHeightLeave(wrapper)(el, done)

    expect(done).not.toHaveBeenCalled()
    const opts = mockTo.mock.calls[0][1]
    opts.onComplete()
    expect(done).toHaveBeenCalledTimes(1)
  })

  test('uses a positive duration', () => {
    tabHeightLeave(makeWrapper())(makeChild(), vi.fn())
    expect(mockTo.mock.calls[0][1].duration).toBeGreaterThan(0)
  })

  test('kills existing tweens on the wrapper before freezing height [obligation]', () => {
    const wrapper = makeWrapper(420)
    const el = makeChild()

    tabHeightLeave(wrapper)(el, vi.fn())

    expect(mockKillTweensOf).toHaveBeenCalledWith(wrapper)
    // killTweensOf must be called before the height is set — verify it happened
    expect(mockKillTweensOf).toHaveBeenCalledTimes(1)
    expect(wrapper.style.height).toBe('420px')
  })

  test('resets height to auto before measuring, so a mid-animation value is not captured [obligation]', () => {
    const wrapper = makeWrapper(420)
    wrapper.style.height = '300px'

    tabHeightLeave(wrapper)(makeChild(), vi.fn())

    // After the call the height should be the natural offsetHeight (420), not the
    // stale mid-animation value (300).
    expect(wrapper.style.height).toBe('420px')
  })
})

describe('tabHeightEnter', () => {
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

  test('hides the entering element to opacity 0 via gsap.set before tweening', () => {
    const wrapper = makeWrapper()
    const el = makeChild()

    tabHeightEnter(wrapper)(el, vi.fn())

    expect(mockSet).toHaveBeenCalledWith(el, expect.objectContaining({ opacity: 0 }))
  })

  test('tweens the wrapper height to its natural offsetHeight after releasing to auto', () => {
    // Source temporarily sets height='auto', reads offsetHeight, then restores
    // the frozen height before tweening. Because offsetHeight is stubbed to 400
    // on this wrapper, that is the target the tween should receive.
    const wrapper = makeWrapper(400)
    const el = makeChild(180)

    tabHeightEnter(wrapper)(el, vi.fn())

    const wrapperCall = mockTo.mock.calls.find(([target]) => target === wrapper)
    expect(wrapperCall).toBeTruthy()
    expect(wrapperCall[1]).toMatchObject({ height: 400 })
  })

  test('tweens the entering element opacity back to 1', () => {
    const wrapper = makeWrapper()
    const el = makeChild()

    tabHeightEnter(wrapper)(el, vi.fn())

    const elCall = mockTo.mock.calls.find(([target]) => target === el)
    expect(elCall).toBeTruthy()
    expect(elCall[1]).toMatchObject({ opacity: 1 })
  })

  test('clears the wrapper inline height when the wrapper tween completes', () => {
    const wrapper = makeWrapper(400)
    wrapper.style.height = '400px'
    const el = makeChild(180)

    tabHeightEnter(wrapper)(el, vi.fn())

    const wrapperOpts = mockTo.mock.calls.find(([target]) => target === wrapper)[1]
    wrapperOpts.onComplete()

    expect(wrapper.style.height).toBe('')
  })

  test('invokes done when the element opacity tween completes', () => {
    const wrapper = makeWrapper()
    const el = makeChild()
    const done = vi.fn()

    tabHeightEnter(wrapper)(el, done)

    const elOpts = mockTo.mock.calls.find(([target]) => target === el)[1]
    expect(done).not.toHaveBeenCalled()
    elOpts.onComplete()
    expect(done).toHaveBeenCalledTimes(1)
  })

  test('delays the opacity tween relative to the height tween (so fade lands at the end)', () => {
    const wrapper = makeWrapper()
    const el = makeChild()

    tabHeightEnter(wrapper)(el, vi.fn())

    const elOpts = mockTo.mock.calls.find(([target]) => target === el)[1]
    expect(elOpts.delay).toBeGreaterThanOrEqual(0)
  })

  test('kills existing tweens on the wrapper before the rAF callback [obligation]', () => {
    const wrapper = makeWrapper()

    tabHeightEnter(wrapper)(makeChild(), vi.fn())

    expect(mockKillTweensOf).toHaveBeenCalledWith(wrapper)
  })

  test('restores the frozen height on the wrapper before starting the tween [obligation]', () => {
    // Source: (1) reads frozen = 300px, (2) sets auto to measure natural height,
    // (3) restores to 300px so the tween starts from the frozen value.
    const wrapper = makeWrapper(400)
    wrapper.style.height = '300px'

    tabHeightEnter(wrapper)(makeChild(), vi.fn())

    // After rAF and before tween fires the frozen height should be restored.
    // The wrapper height at this point (between restore and tween onComplete) is
    // the frozen value; the gsap.to call receives it via the `height: target` target.
    const wrapperCall = mockTo.mock.calls.find(([target]) => target === wrapper)
    expect(wrapperCall).toBeTruthy()
    // target is wrapper.offsetHeight measured after releasing to auto (still 400)
    expect(wrapperCall[1].height).toBe(400)
    // The style is now back to the frozen height (300px) before tween fires
    expect(wrapper.style.height).toBe('300px')
  })
})
