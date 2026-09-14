import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { flushPromises } from '@vue/test-utils'

// ── Hoisted GSAP mock ─────────────────────────────────────────────────────────

const { mockGsapTo, mockGsapSet } = vi.hoisted(() => {
  const mockGsapTo = vi.fn()
  const mockGsapSet = vi.fn()
  return { mockGsapTo, mockGsapSet }
})

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

// Controllable driveHeight stub — a test resolves `resolveSettled()` to simulate
// the stage-height driver settling, and can inspect the recorded call args / cancel spy.
function makeDriveHeight() {
  let resolveSettled
  const settled = new Promise((resolve) => {
    resolveSettled = resolve
  })
  const cancel = vi.fn()
  const driveHeight = vi.fn(() => ({ settled, cancel }))

  return { driveHeight, cancel, resolveSettled }
}

beforeEach(() => {
  mockGsapTo.mockReset()
  mockGsapSet.mockReset()
  // Default: gsap.to immediately calls onComplete
  mockGsapTo.mockImplementation((_el, opts) => opts?.onComplete?.())
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('crossfadeResizeBeforeLeave', () => {
  test('freezes the wrapper height to its current offsetHeight', () => {
    const wrapper = makeEl({ offsetHeight: 120 })
    crossfadeResizeBeforeLeave(wrapper)()
    expect(wrapper.style.height).toBe('120px')
  })

  test('sets overflow to hidden on the wrapper', () => {
    const wrapper = makeEl()
    crossfadeResizeBeforeLeave(wrapper)()
    expect(wrapper.style.overflow).toBe('hidden')
  })

  test('returns a function (factory pattern)', () => {
    const wrapper = makeEl()
    const fn = crossfadeResizeBeforeLeave(wrapper)
    expect(typeof fn).toBe('function')
  })
})

describe('crossfadeResizeLeave', () => {
  test('pins the leaving element (absolute position)', () => {
    const el = makeEl()
    const done = vi.fn()
    crossfadeResizeLeave(el, done)
    expect(el.style.position).toBe('absolute')
  })

  test('calls gsap.to to fade out the element', () => {
    const el = makeEl()
    const done = vi.fn()
    crossfadeResizeLeave(el, done)
    expect(mockGsapTo).toHaveBeenCalledWith(el, expect.objectContaining({ opacity: 0 }))
  })

  test('calls done via onComplete of the fade tween', () => {
    mockGsapTo.mockImplementation((_el, opts) => opts?.onComplete?.())
    const el = makeEl()
    const done = vi.fn()
    crossfadeResizeLeave(el, done)
    expect(done).toHaveBeenCalledTimes(1)
  })
})

describe('crossfadeResizeEnter', () => {
  test('returns a function (factory pattern)', () => {
    const wrapper = makeEl()
    const { driveHeight } = makeDriveHeight()
    const fn = crossfadeResizeEnter(wrapper, driveHeight)
    expect(typeof fn).toBe('function')
  })

  test('pins the entering element (absolute position) mid-tween', () => {
    // Use a mock that does NOT auto-call onComplete so the element stays pinned
    // when we assert — the default mock would call onComplete and unpin immediately.
    mockGsapTo.mockImplementation(() => {})
    const wrapper = makeEl()
    const el = makeEl({ scrollHeight: 80 })
    const done = vi.fn()
    const { driveHeight } = makeDriveHeight()
    crossfadeResizeEnter(wrapper, driveHeight)(el, done)
    expect(el.style.position).toBe('absolute')
  })

  test('sets el opacity to 0 via gsap.set before tweening', () => {
    const wrapper = makeEl()
    const el = makeEl({ scrollHeight: 80 })
    const done = vi.fn()
    const { driveHeight } = makeDriveHeight()
    crossfadeResizeEnter(wrapper, driveHeight)(el, done)
    expect(mockGsapSet).toHaveBeenCalledWith(el, { opacity: 0 })
  })

  // ── animate_height=false (snap) branch — unchanged behaviour ─────────────

  describe('animate_height=false (snap branch)', () => {
    test('snaps wrapper height to the incoming el scrollHeight via gsap.set', () => {
      const wrapper = makeEl()
      const el = makeEl({ scrollHeight: 200 })
      const done = vi.fn()
      const { driveHeight } = makeDriveHeight()
      crossfadeResizeEnter(wrapper, driveHeight)(el, done)

      expect(mockGsapSet).toHaveBeenCalledWith(wrapper, { height: 200 })
    })

    test('tweens el opacity to 1 separately', () => {
      const wrapper = makeEl()
      const el = makeEl()
      const done = vi.fn()
      const { driveHeight } = makeDriveHeight()
      crossfadeResizeEnter(wrapper, driveHeight)(el, done)

      const fadeInCall = mockGsapTo.mock.calls.find(
        ([target, opts]) => target === el && opts?.opacity === 1
      )
      expect(fadeInCall).toBeDefined()
    })

    test('onComplete of opacity tween clears wrapper height and overflow', () => {
      const wrapper = makeEl()
      const el = makeEl()
      const done = vi.fn()
      const { driveHeight } = makeDriveHeight()

      mockGsapTo.mockImplementation((target, opts) => {
        if (target === el) opts?.onComplete?.()
      })

      crossfadeResizeEnter(wrapper, driveHeight)(el, done)

      expect(wrapper.style.height).toBe('')
      expect(wrapper.style.overflow).toBe('')
    })

    test('onComplete unpins the entering element', () => {
      const wrapper = makeEl()
      const el = makeEl()
      const done = vi.fn()
      const { driveHeight } = makeDriveHeight()

      mockGsapTo.mockImplementation((target, opts) => {
        if (target === el) opts?.onComplete?.()
      })

      crossfadeResizeEnter(wrapper, driveHeight)(el, done)

      expect(el.style.position).toBe('')
    })

    test('onComplete calls done', () => {
      const wrapper = makeEl()
      const el = makeEl()
      const done = vi.fn()
      const { driveHeight } = makeDriveHeight()

      mockGsapTo.mockImplementation((target, opts) => {
        if (target === el) opts?.onComplete?.()
      })

      crossfadeResizeEnter(wrapper, driveHeight)(el, done)

      expect(done).toHaveBeenCalledTimes(1)
    })

    test('clips overflow only during tween — wrapper.overflow is empty at rest', () => {
      const wrapper = makeEl()
      const el = makeEl()
      const done = vi.fn()
      const { driveHeight } = makeDriveHeight()

      mockGsapTo.mockImplementation((target, opts) => {
        if (target === el) opts?.onComplete?.()
      })

      crossfadeResizeEnter(wrapper, driveHeight)(el, done)

      expect(wrapper.style.overflow).toBe('')
    })

    test('defaults animate_height to false — snaps via gsap.set and never calls driveHeight', () => {
      const wrapper = makeEl()
      const el = makeEl({ scrollHeight: 200 })
      const done = vi.fn()
      const { driveHeight } = makeDriveHeight()

      crossfadeResizeEnter(wrapper, driveHeight)(el, done)

      expect(mockGsapSet).toHaveBeenCalledWith(wrapper, { height: 200 })
      expect(driveHeight).not.toHaveBeenCalled()
    })

    test('returns null, not a cancel function', () => {
      const wrapper = makeEl()
      const el = makeEl()
      const done = vi.fn()
      const { driveHeight } = makeDriveHeight()

      const cancel = crossfadeResizeEnter(wrapper, driveHeight)(el, done)

      expect(cancel).toBeNull()
    })
  })

  // ── animate_height=true branch ────────────────────────────────

  describe('animate_height=true', () => {
    test('drives the height through driveHeight with the scrollHeight target and the fixed timing, never gsap.set for height', () => {
      const wrapper = makeEl()
      const el = makeEl({ scrollHeight: 200 })
      const done = vi.fn()
      const { driveHeight } = makeDriveHeight()

      crossfadeResizeEnter(wrapper, driveHeight, true)(el, done)

      expect(driveHeight).toHaveBeenCalledWith(200, { duration: 0.2, ease: 'power2.out' })
      expect(mockGsapSet).not.toHaveBeenCalledWith(
        wrapper,
        expect.objectContaining({ height: 200 })
      )
    })

    test('fades the entering element in via gsap.to independently of the height drive', () => {
      const wrapper = makeEl()
      const el = makeEl({ scrollHeight: 200 })
      const done = vi.fn()
      const { driveHeight } = makeDriveHeight()

      crossfadeResizeEnter(wrapper, driveHeight, true)(el, done)

      const fadeInCall = mockGsapTo.mock.calls.find(
        ([target, opts]) => target === el && opts?.opacity === 1
      )
      expect(fadeInCall).toBeDefined()
    })

    test('cleanup runs — clearing wrapper height/overflow, unpinning the element, and calling done — only when the returned settled promise resolves', async () => {
      const wrapper = makeEl()
      const el = makeEl({ scrollHeight: 200 })
      const done = vi.fn()
      const { driveHeight, resolveSettled } = makeDriveHeight()

      crossfadeResizeEnter(wrapper, driveHeight, true)(el, done)

      expect(done).not.toHaveBeenCalled()
      expect(wrapper.style.height).toBeUndefined()

      resolveSettled()
      await flushPromises()

      expect(wrapper.style.height).toBe('')
      expect(wrapper.style.overflow).toBe('')
      expect(el.style.position).toBe('')
      expect(done).toHaveBeenCalledTimes(1)
    })

    test('returns the driveHeight change`s own cancel function', () => {
      const wrapper = makeEl()
      const el = makeEl({ scrollHeight: 200 })
      const done = vi.fn()
      const { driveHeight, cancel } = makeDriveHeight()

      const returned = crossfadeResizeEnter(wrapper, driveHeight, true)(el, done)

      expect(returned).toBe(cancel)
    })
  })
})
