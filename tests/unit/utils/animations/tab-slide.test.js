import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { ref } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockTo, mockFromTo } = vi.hoisted(() => ({
  mockTo: vi.fn(),
  mockFromTo: vi.fn()
}))

vi.mock('gsap', () => ({ gsap: { to: mockTo, fromTo: mockFromTo } }))

import { tabSlideLeave, tabSlideEnter } from '@/utils/animations/tab-slide'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEl(scrollHeight = 200) {
  const el = document.createElement('div')
  Object.defineProperty(el, 'scrollHeight', { value: scrollHeight, configurable: true })
  return el
}

function makeWrapper(offsetHeight = 400) {
  const el = document.createElement('div')
  Object.defineProperty(el, 'offsetHeight', { value: offsetHeight, configurable: true })
  return el
}

// ── tabSlideLeave ─────────────────────────────────────────────────────────────

describe('tabSlideLeave — forward direction', () => {
  beforeEach(() => vi.clearAllMocks())

  test('fades leaving element to opacity 0 via gsap.to', () => {
    const direction = ref('forward')
    const el = makeEl()
    const done = vi.fn()

    tabSlideLeave(direction)(el, done)

    expect(mockTo).toHaveBeenCalledWith(el, expect.objectContaining({ opacity: 0 }))
  })

  test('does NOT slide on x-axis when direction is forward', () => {
    const direction = ref('forward')
    tabSlideLeave(direction)(makeEl(), vi.fn())

    const opts = mockTo.mock.calls[0][1]
    expect(opts.x).toBeUndefined()
  })

  test('calls done via onComplete', () => {
    const direction = ref('forward')
    const done = vi.fn()

    tabSlideLeave(direction)(makeEl(), done)

    expect(done).not.toHaveBeenCalled()
    const opts = mockTo.mock.calls[0][1]
    opts.onComplete()
    expect(done).toHaveBeenCalledTimes(1)
  })

  test('uses a positive LEAVE_DURATION', () => {
    const direction = ref('forward')
    tabSlideLeave(direction)(makeEl(), vi.fn())
    expect(mockTo.mock.calls[0][1].duration).toBeGreaterThan(0)
  })
})

describe('tabSlideLeave — back direction', () => {
  beforeEach(() => vi.clearAllMocks())

  test('slides leaving element to the right (positive x) on back direction', () => {
    const direction = ref('back')
    tabSlideLeave(direction)(makeEl(), vi.fn())

    const opts = mockTo.mock.calls[0][1]
    expect(opts.x).toBeGreaterThan(0)
  })

  test('fades opacity to 0 on back direction', () => {
    const direction = ref('back')
    tabSlideLeave(direction)(makeEl(), vi.fn())

    const opts = mockTo.mock.calls[0][1]
    expect(opts.opacity).toBe(0)
  })

  test('calls done via onComplete on back direction', () => {
    const direction = ref('back')
    const done = vi.fn()

    tabSlideLeave(direction)(makeEl(), done)

    const opts = mockTo.mock.calls[0][1]
    opts.onComplete()
    expect(done).toHaveBeenCalledTimes(1)
  })
})

describe('tabSlideLeave — with wrapper', () => {
  beforeEach(() => vi.clearAllMocks())

  test('freezes wrapper height to its current offsetHeight in px', () => {
    const direction = ref('forward')
    const wrapper = makeWrapper(350)

    tabSlideLeave(direction, wrapper)(makeEl(), vi.fn())

    expect(wrapper.style.height).toBe('350px')
  })

  test('still calls done via onComplete when wrapper is provided', () => {
    const direction = ref('forward')
    const wrapper = makeWrapper()
    const done = vi.fn()

    tabSlideLeave(direction, wrapper)(makeEl(), done)

    const opts = mockTo.mock.calls[0][1]
    opts.onComplete()
    expect(done).toHaveBeenCalledTimes(1)
  })
})

// ── tabSlideEnter ─────────────────────────────────────────────────────────────

describe('tabSlideEnter — forward direction', () => {
  beforeEach(() => vi.clearAllMocks())

  test('slides entering element in from the right (x=SLIDE_X → x=0) on forward', () => {
    const direction = ref('forward')
    const el = makeEl()

    tabSlideEnter(direction)(el, vi.fn())

    expect(mockFromTo).toHaveBeenCalledWith(
      el,
      expect.objectContaining({ x: expect.any(Number), opacity: 0 }),
      expect.objectContaining({ x: 0, opacity: 1 })
    )
    const [, from] = mockFromTo.mock.calls[0]
    expect(from.x).toBeGreaterThan(0)
  })

  test('calls done via onComplete on forward direction', () => {
    const direction = ref('forward')
    const done = vi.fn()

    tabSlideEnter(direction)(makeEl(), done)

    const [, , to] = mockFromTo.mock.calls[0]
    to.onComplete()
    expect(done).toHaveBeenCalledTimes(1)
  })

  test('uses a positive ENTER_DURATION on forward', () => {
    const direction = ref('forward')
    tabSlideEnter(direction)(makeEl(), vi.fn())
    const [, , to] = mockFromTo.mock.calls[0]
    expect(to.duration).toBeGreaterThan(0)
  })
})

describe('tabSlideEnter — back direction', () => {
  beforeEach(() => vi.clearAllMocks())

  test('fades entering element from opacity 0 to 1 on back', () => {
    const direction = ref('back')
    const el = makeEl()

    tabSlideEnter(direction)(el, vi.fn())

    expect(mockFromTo).toHaveBeenCalledWith(
      el,
      expect.objectContaining({ opacity: 0 }),
      expect.objectContaining({ opacity: 1 })
    )
  })

  test('does NOT include x slide on back direction', () => {
    const direction = ref('back')
    tabSlideEnter(direction)(makeEl(), vi.fn())

    const [, from] = mockFromTo.mock.calls[0]
    expect(from.x).toBeUndefined()
  })

  test('calls done via onComplete on back direction', () => {
    const direction = ref('back')
    const done = vi.fn()

    tabSlideEnter(direction)(makeEl(), done)

    const [, , to] = mockFromTo.mock.calls[0]
    to.onComplete()
    expect(done).toHaveBeenCalledTimes(1)
  })
})

describe('tabSlideEnter — with wrapper', () => {
  beforeEach(() => vi.clearAllMocks())

  test('tweens wrapper height to entering element scrollHeight', () => {
    const direction = ref('forward')
    const wrapper = makeWrapper(400)
    const el = makeEl(220)

    tabSlideEnter(direction, wrapper)(el, vi.fn())

    const wrapperCall = mockTo.mock.calls.find(([target]) => target === wrapper)
    expect(wrapperCall).toBeTruthy()
    expect(wrapperCall[1]).toMatchObject({ height: 220 })
  })

  test('clears wrapper inline height after its tween completes', () => {
    const direction = ref('forward')
    const wrapper = makeWrapper(400)
    wrapper.style.height = '400px'

    tabSlideEnter(direction, wrapper)(makeEl(180), vi.fn())

    const wrapperCall = mockTo.mock.calls.find(([target]) => target === wrapper)
    wrapperCall[1].onComplete()
    expect(wrapper.style.height).toBe('')
  })
})

// ── tab_initial_render fast-path (obligation) ─────────────────────────────────
// This is tested via the deck-settings integration test where the onTabEnter
// hook calls done() immediately without invoking tabSlideEnter.
// The unit test below confirms tabSlideEnter is NOT a no-op itself — verifying
// that the fast-path must live in the caller, not in this util.
describe('tabSlideEnter — no built-in initial-render fast-path', () => {
  beforeEach(() => vi.clearAllMocks())

  test('always runs a GSAP tween — no done-only shortcut inside the util', () => {
    const direction = ref('forward')
    const done = vi.fn()

    tabSlideEnter(direction)(makeEl(), done)

    // The tween is scheduled (done is not called immediately)
    expect(done).not.toHaveBeenCalled()
    // Simulate GSAP completing
    const [, , to] = mockFromTo.mock.calls[0]
    to.onComplete()
    expect(done).toHaveBeenCalledTimes(1)
  })
})
