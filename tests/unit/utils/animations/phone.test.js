import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockDefineMotion, motionCalls, rafCallbacks } = vi.hoisted(() => {
  const motionCalls = []
  const rafCallbacks = []

  function mockDefineMotion(spec) {
    return (el) => {
      let resolveDone
      const done = new Promise((resolve) => {
        resolveDone = resolve
      })
      motionCalls.push({ spec, el, resolveDone })
      return { done }
    }
  }

  return { mockDefineMotion, motionCalls, rafCallbacks }
})

vi.mock('@/utils/motion/driver', () => ({ defineMotion: mockDefineMotion }))

vi.stubGlobal('requestAnimationFrame', (cb) => {
  rafCallbacks.push(cb)
  return rafCallbacks.length
})

import {
  slideDownBlurIn,
  slideUpBlurOut,
  slideUpBlurIn,
  slideDownBlurOut
} from '@/utils/animations/phone'

// ── Helpers ───────────────────────────────────────────────────────────────────

function el() {
  return document.createElement('div')
}

// Models nested rAF scheduling: a flushed callback that itself calls
// requestAnimationFrame enqueues onto the same queue rather than running inline,
// so a double-rAF chain needs two flushes to fully resolve.
function flushRaf() {
  const pending = rafCallbacks.splice(0, rafCallbacks.length)
  pending.forEach((cb) => cb())
}

function lastMotionCall() {
  return motionCalls[motionCalls.length - 1]
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('phone animations', () => {
  beforeEach(() => {
    motionCalls.length = 0
    rafCallbacks.length = 0
  })

  describe('blur-in (enter)', () => {
    test('slideDownBlurIn holds data-phone-blur true through the first frame, then clears on the second', () => {
      const element = el()

      slideDownBlurIn(element, vi.fn())
      expect(element.dataset.phoneBlur).toBe('true')

      flushRaf()
      expect(element.dataset.phoneBlur).toBe('true')

      flushRaf()
      expect(element.dataset.phoneBlur).toBe('false')
    })

    test('slideUpBlurIn holds data-phone-blur true through the first frame, then clears on the second', () => {
      const element = el()

      slideUpBlurIn(element, vi.fn())
      expect(element.dataset.phoneBlur).toBe('true')

      flushRaf()
      expect(element.dataset.phoneBlur).toBe('true')

      flushRaf()
      expect(element.dataset.phoneBlur).toBe('false')
    })
  })

  describe('blur-out (leave)', () => {
    test('slideUpBlurOut sets data-phone-blur true and leaves it blurred', () => {
      const element = el()

      slideUpBlurOut(element, vi.fn())

      expect(element.dataset.phoneBlur).toBe('true')
    })

    test('slideDownBlurOut sets data-phone-blur true and leaves it blurred', () => {
      const element = el()

      slideDownBlurOut(element, vi.fn())

      expect(element.dataset.phoneBlur).toBe('true')
    })
  })

  describe('done resolution', () => {
    test('slideDownBlurIn resolves done once the underlying motion completes', async () => {
      const done = vi.fn()
      slideDownBlurIn(el(), done)

      lastMotionCall().resolveDone()
      await Promise.resolve()
      await Promise.resolve()

      expect(done).toHaveBeenCalled()
    })

    test('slideUpBlurOut resolves done once the underlying motion completes', async () => {
      const done = vi.fn()
      slideUpBlurOut(el(), done)

      lastMotionCall().resolveDone()
      await Promise.resolve()
      await Promise.resolve()

      expect(done).toHaveBeenCalled()
    })

    test('slideUpBlurIn resolves done once the underlying motion completes', async () => {
      const done = vi.fn()
      slideUpBlurIn(el(), done)

      lastMotionCall().resolveDone()
      await Promise.resolve()
      await Promise.resolve()

      expect(done).toHaveBeenCalled()
    })

    test('slideDownBlurOut resolves done once the underlying motion completes', async () => {
      const done = vi.fn()
      slideDownBlurOut(el(), done)

      lastMotionCall().resolveDone()
      await Promise.resolve()
      await Promise.resolve()

      expect(done).toHaveBeenCalled()
    })
  })

  describe('travel direction', () => {
    test('slideDownBlurIn travels from above (negative translateY) to rest', () => {
      slideDownBlurIn(el(), vi.fn())

      const { spec } = lastMotionCall()
      expect(spec.from.translateY).toBeLessThan(0)
      expect(spec.to.translateY).toBe(0)
    })

    test('slideUpBlurOut travels upward (negative translateY)', () => {
      slideUpBlurOut(el(), vi.fn())

      const { spec } = lastMotionCall()
      expect(spec.to.translateY).toBeLessThan(0)
    })

    test('slideUpBlurIn travels from below (positive translateY) to rest', () => {
      slideUpBlurIn(el(), vi.fn())

      const { spec } = lastMotionCall()
      expect(spec.from.translateY).toBeGreaterThan(0)
      expect(spec.to.translateY).toBe(0)
    })

    test('slideDownBlurOut travels downward (positive translateY)', () => {
      slideDownBlurOut(el(), vi.fn())

      const { spec } = lastMotionCall()
      expect(spec.to.translateY).toBeGreaterThan(0)
    })
  })
})
