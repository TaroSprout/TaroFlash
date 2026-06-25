import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

// ── Hoisted GSAP mock ─────────────────────────────────────────────────────────

const { mockGsapTo, mockGsapSet } = vi.hoisted(() => ({
  mockGsapTo: vi.fn(),
  mockGsapSet: vi.fn()
}))

vi.mock('gsap', () => ({
  gsap: {
    to: mockGsapTo,
    set: mockGsapSet
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
  // Default: gsap.to immediately calls onComplete
  mockGsapTo.mockImplementation((_el, opts) => opts?.onComplete?.())
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

  test('tweens wrapper height to the incoming el scrollHeight [obligation]', () => {
    const wrapper = makeEl()
    const el = makeEl({ scrollHeight: 200 })
    const done = vi.fn()
    crossfadeResizeEnter(wrapper)(el, done)

    const heightCall = mockGsapTo.mock.calls.find(
      ([target, opts]) => target === wrapper && opts?.height !== undefined
    )
    expect(heightCall).toBeDefined()
    expect(heightCall[1].height).toBe(200)
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

  test('onComplete of height tween clears wrapper height and overflow [obligation]', () => {
    // Make only the wrapper height tween call onComplete
    mockGsapTo.mockImplementation((target, opts) => {
      if (target === wrapper) opts?.onComplete?.()
    })

    const wrapper = makeEl()
    const el = makeEl()
    const done = vi.fn()
    crossfadeResizeEnter(wrapper)(el, done)

    expect(wrapper.style.height).toBe('')
    expect(wrapper.style.overflow).toBe('')
  })

  test('onComplete unpins the entering element [obligation]', () => {
    const wrapper = makeEl()
    const el = makeEl()
    const done = vi.fn()

    mockGsapTo.mockImplementation((target, opts) => {
      if (target === wrapper) opts?.onComplete?.()
    })

    crossfadeResizeEnter(wrapper)(el, done)

    expect(el.style.position).toBe('')
  })

  test('onComplete calls done [obligation]', () => {
    const wrapper = makeEl()
    const el = makeEl()
    const done = vi.fn()

    mockGsapTo.mockImplementation((target, opts) => {
      if (target === wrapper) opts?.onComplete?.()
    })

    crossfadeResizeEnter(wrapper)(el, done)

    expect(done).toHaveBeenCalledTimes(1)
  })

  test('clips overflow only during tween — wrapper.overflow is empty at rest [obligation]', () => {
    // After onComplete, overflow must be cleared (not remain hidden)
    const wrapper = makeEl()
    const el = makeEl()
    const done = vi.fn()

    // Simulate onComplete running
    mockGsapTo.mockImplementation((target, opts) => {
      if (target === wrapper) opts?.onComplete?.()
    })

    crossfadeResizeEnter(wrapper)(el, done)

    expect(wrapper.style.overflow).toBe('')
  })
})
