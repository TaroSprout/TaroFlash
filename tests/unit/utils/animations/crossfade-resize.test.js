import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

// ── Hoisted GSAP mock ─────────────────────────────────────────────────────────

const { mockGsapTo, mockGsapSet, mockGsapTimeline, makeTimelineStub } = vi.hoisted(() => {
  const mockGsapTo = vi.fn()
  const mockGsapSet = vi.fn()

  // Timeline stub records .to() calls and fires the given onComplete once
  // both are queued — tests trigger it manually via `timeline._complete()`.
  function makeTimelineStub(opts) {
    const calls = []
    const timeline = {
      calls,
      to(target, tweenOpts, position) {
        calls.push([target, tweenOpts, position])
        return timeline
      },
      _complete: () => opts?.onComplete?.()
    }
    return timeline
  }

  const mockGsapTimeline = vi.fn(makeTimelineStub)

  return { mockGsapTo, mockGsapSet, mockGsapTimeline, makeTimelineStub }
})

vi.mock('gsap', () => ({
  gsap: {
    to: mockGsapTo,
    set: mockGsapSet,
    timeline: mockGsapTimeline
  }
}))

// ── Imports ───────────────────────────────────────────────────────────────────

import {
  crossfadeResizeBeforeLeave,
  crossfadeResizeLeave,
  crossfadeResizeEnter
} from '@/utils/animations/crossfade-resize'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEl(overrides = {}) {
  return {
    offsetHeight: 100,
    scrollHeight: 80,
    style: {},
    ...overrides
  }
}

beforeEach(() => {
  mockGsapTo.mockReset()
  mockGsapSet.mockReset()
  mockGsapTimeline.mockReset()
  // Default: gsap.to immediately calls onComplete
  mockGsapTo.mockImplementation((_el, opts) => opts?.onComplete?.())
  mockGsapTimeline.mockImplementation(makeTimelineStub)
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('crossfadeResizeBeforeLeave [obligation]', () => {
  test('freezes the wrapper height to its current offsetHeight [obligation]', () => {
    const wrapper = makeEl({ offsetHeight: 120 })
    crossfadeResizeBeforeLeave(wrapper)()
    expect(wrapper.style.height).toBe('120px')
  })

  test('sets overflow to hidden on the wrapper [obligation]', () => {
    const wrapper = makeEl()
    crossfadeResizeBeforeLeave(wrapper)()
    expect(wrapper.style.overflow).toBe('hidden')
  })

  test('returns a function (factory pattern) [obligation]', () => {
    const wrapper = makeEl()
    const fn = crossfadeResizeBeforeLeave(wrapper)
    expect(typeof fn).toBe('function')
  })
})

describe('crossfadeResizeLeave [obligation]', () => {
  test('pins the leaving element (absolute position) [obligation]', () => {
    const el = makeEl()
    const done = vi.fn()
    crossfadeResizeLeave(el, done)
    expect(el.style.position).toBe('absolute')
  })

  test('calls gsap.to to fade out the element [obligation]', () => {
    const el = makeEl()
    const done = vi.fn()
    crossfadeResizeLeave(el, done)
    expect(mockGsapTo).toHaveBeenCalledWith(el, expect.objectContaining({ opacity: 0 }))
  })

  test('calls done via onComplete of the fade tween [obligation]', () => {
    mockGsapTo.mockImplementation((_el, opts) => opts?.onComplete?.())
    const el = makeEl()
    const done = vi.fn()
    crossfadeResizeLeave(el, done)
    expect(done).toHaveBeenCalledTimes(1)
  })
})

describe('crossfadeResizeEnter [obligation]', () => {
  test('returns a function (factory pattern) [obligation]', () => {
    const wrapper = makeEl()
    const fn = crossfadeResizeEnter(wrapper)
    expect(typeof fn).toBe('function')
  })

  test('pins the entering element (absolute position) mid-tween [obligation]', () => {
    // Use a mock that does NOT auto-call onComplete so the element stays pinned
    // when we assert — the default mock would call onComplete and unpin immediately.
    mockGsapTo.mockImplementation(() => {})
    const wrapper = makeEl()
    const el = makeEl({ scrollHeight: 80 })
    const done = vi.fn()
    crossfadeResizeEnter(wrapper)(el, done)
    expect(el.style.position).toBe('absolute')
  })

  test('sets el opacity to 0 via gsap.set before tweening [obligation]', () => {
    const wrapper = makeEl()
    const el = makeEl({ scrollHeight: 80 })
    const done = vi.fn()
    crossfadeResizeEnter(wrapper)(el, done)
    expect(mockGsapSet).toHaveBeenCalledWith(el, { opacity: 0 })
  })

  test('snaps wrapper height to the incoming el scrollHeight via gsap.set [obligation]', () => {
    const wrapper = makeEl()
    const el = makeEl({ scrollHeight: 200 })
    const done = vi.fn()
    crossfadeResizeEnter(wrapper)(el, done)

    expect(mockGsapSet).toHaveBeenCalledWith(wrapper, { height: 200 })
  })

  test('tweens el opacity to 1 separately [obligation]', () => {
    const wrapper = makeEl()
    const el = makeEl()
    const done = vi.fn()
    crossfadeResizeEnter(wrapper)(el, done)

    const fadeInCall = mockGsapTo.mock.calls.find(
      ([target, opts]) => target === el && opts?.opacity === 1
    )
    expect(fadeInCall).toBeDefined()
  })

  test('onComplete of opacity tween clears wrapper height and overflow [obligation]', () => {
    // onComplete now lives on the gsap.to(node, { opacity: 1 }) call, not the wrapper
    const wrapper = makeEl()
    const el = makeEl()
    const done = vi.fn()

    mockGsapTo.mockImplementation((target, opts) => {
      if (target === el) opts?.onComplete?.()
    })

    crossfadeResizeEnter(wrapper)(el, done)

    expect(wrapper.style.height).toBe('')
    expect(wrapper.style.overflow).toBe('')
  })

  test('onComplete unpins the entering element [obligation]', () => {
    const wrapper = makeEl()
    const el = makeEl()
    const done = vi.fn()

    mockGsapTo.mockImplementation((target, opts) => {
      if (target === el) opts?.onComplete?.()
    })

    crossfadeResizeEnter(wrapper)(el, done)

    expect(el.style.position).toBe('')
  })

  test('onComplete calls done [obligation]', () => {
    const wrapper = makeEl()
    const el = makeEl()
    const done = vi.fn()

    mockGsapTo.mockImplementation((target, opts) => {
      if (target === el) opts?.onComplete?.()
    })

    crossfadeResizeEnter(wrapper)(el, done)

    expect(done).toHaveBeenCalledTimes(1)
  })

  test('clips overflow only during tween — wrapper.overflow is empty at rest [obligation]', () => {
    // After onComplete, overflow must be cleared (not remain hidden)
    const wrapper = makeEl()
    const el = makeEl()
    const done = vi.fn()

    // Simulate onComplete running (lives on the node opacity tween)
    mockGsapTo.mockImplementation((target, opts) => {
      if (target === el) opts?.onComplete?.()
    })

    crossfadeResizeEnter(wrapper)(el, done)

    expect(wrapper.style.overflow).toBe('')
  })

  // ── animate_height=true branch [obligation] ────────────────────────────────

  test('defaults animate_height to false — uses gsap.set snap, not a timeline', () => {
    const wrapper = makeEl()
    const el = makeEl({ scrollHeight: 200 })
    const done = vi.fn()

    crossfadeResizeEnter(wrapper)(el, done)

    expect(mockGsapSet).toHaveBeenCalledWith(wrapper, { height: 200 })
    expect(mockGsapTimeline).not.toHaveBeenCalled()
  })

  test('animate_height=true uses a single gsap.timeline instead of gsap.set for height [obligation]', () => {
    const wrapper = makeEl()
    const el = makeEl({ scrollHeight: 200 })
    const done = vi.fn()

    crossfadeResizeEnter(wrapper, true)(el, done)

    expect(mockGsapTimeline).toHaveBeenCalledOnce()
    expect(mockGsapSet).not.toHaveBeenCalledWith(wrapper, { height: 200 })
  })

  test('animate_height=true tweens both wrapper height and el opacity on the same timeline at position 0 [obligation]', () => {
    const wrapper = makeEl()
    const el = makeEl({ scrollHeight: 200 })
    const done = vi.fn()

    crossfadeResizeEnter(wrapper, true)(el, done)

    const timeline = mockGsapTimeline.mock.results[0].value
    const heightCall = timeline.calls.find(([target]) => target === wrapper)
    const opacityCall = timeline.calls.find(([target]) => target === el)

    expect(heightCall).toEqual([wrapper, expect.objectContaining({ height: 200 }), 0])
    expect(opacityCall).toEqual([el, expect.objectContaining({ opacity: 1 }), 0])
  })

  test('animate_height=true releases the wrapper and calls done only when the timeline completes [obligation]', () => {
    const wrapper = makeEl()
    const el = makeEl({ scrollHeight: 200 })
    const done = vi.fn()

    crossfadeResizeEnter(wrapper, true)(el, done)
    const timeline = mockGsapTimeline.mock.results[0].value

    // Before the timeline completes, cleanup must not have run yet.
    expect(done).not.toHaveBeenCalled()
    expect(wrapper.style.height).not.toBe('')

    timeline._complete()

    expect(wrapper.style.height).toBe('')
    expect(wrapper.style.overflow).toBe('')
    expect(el.style.position).toBe('')
    expect(done).toHaveBeenCalledTimes(1)
  })
})
