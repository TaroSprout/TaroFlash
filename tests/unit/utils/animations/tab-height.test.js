import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { mockSet, mockTo } = vi.hoisted(() => ({
  mockSet: vi.fn(),
  mockTo: vi.fn()
}))

vi.mock('gsap', () => ({ gsap: { set: mockSet, to: mockTo } }))

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
  beforeEach(() => vi.clearAllMocks())

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
})

describe('tabHeightEnter', () => {
  beforeEach(() => vi.clearAllMocks())

  test('hides the entering element to opacity 0 via gsap.set before tweening', () => {
    const wrapper = makeWrapper()
    const el = makeChild()

    tabHeightEnter(wrapper)(el, vi.fn())

    expect(mockSet).toHaveBeenCalledWith(el, expect.objectContaining({ opacity: 0 }))
  })

  test('tweens the wrapper height to the entering element scrollHeight', () => {
    const wrapper = makeWrapper(400)
    const el = makeChild(180)

    tabHeightEnter(wrapper)(el, vi.fn())

    const wrapperCall = mockTo.mock.calls.find(([target]) => target === wrapper)
    expect(wrapperCall).toBeTruthy()
    expect(wrapperCall[1]).toMatchObject({ height: 180 })
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
})
