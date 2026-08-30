import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockFromTo, mockTo } = vi.hoisted(() => ({
  mockFromTo: vi.fn(),
  mockTo: vi.fn()
}))

vi.mock('gsap', () => ({ gsap: { fromTo: mockFromTo, to: mockTo } }))

import {
  slideDownBlurIn,
  slideUpBlurOut,
  slideUpBlurIn,
  slideDownBlurOut
} from '@/utils/animations/phone'

// ── Helpers ───────────────────────────────────────────────────────────────────

const el = document.createElement('div')
const done = vi.fn()

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('phone animations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('slideDownBlurIn', () => {
    test('enters from above with blur (negative translateY → 0)', () => {
      slideDownBlurIn(el, done)

      expect(mockFromTo).toHaveBeenCalledWith(
        el,
        expect.objectContaining({ opacity: 0 }),
        expect.objectContaining({ translateY: 0, opacity: 1, filter: 'blur(0)' })
      )

      const [, from] = mockFromTo.mock.calls[0]
      expect(from.translateY).toMatch(/^-/)
    })

    test('calls done via onComplete', () => {
      slideDownBlurIn(el, done)

      expect(mockFromTo).toHaveBeenCalledWith(
        el,
        expect.anything(),
        expect.objectContaining({ onComplete: done })
      )
    })

    test('clears the inline transform on completion, so the resting rotate/scale classes survive [obligation]', () => {
      slideDownBlurIn(el, done)

      expect(mockFromTo).toHaveBeenCalledWith(
        el,
        expect.anything(),
        expect.objectContaining({ clearProps: 'transform' })
      )
    })
  })

  describe('slideUpBlurOut', () => {
    test('exits upward with blur (negative translateY)', () => {
      slideUpBlurOut(el, done)

      const [, vars] = mockTo.mock.calls[0]
      expect(vars.translateY).toMatch(/^-/)
      expect(vars.opacity).toBe(0)
    })

    test('calls done via onComplete', () => {
      slideUpBlurOut(el, done)

      expect(mockTo).toHaveBeenCalledWith(el, expect.objectContaining({ onComplete: done }))
    })
  })

  describe('slideUpBlurIn', () => {
    test('enters from below with blur (positive translateY → 0)', () => {
      slideUpBlurIn(el, done)

      const [, from] = mockFromTo.mock.calls[0]
      expect(parseInt(from.translateY)).toBeGreaterThan(0)

      expect(mockFromTo).toHaveBeenCalledWith(
        el,
        expect.anything(),
        expect.objectContaining({ translateY: 0, opacity: 1, filter: 'blur(0)' })
      )
    })

    test('calls done via onComplete', () => {
      slideUpBlurIn(el, done)

      expect(mockFromTo).toHaveBeenCalledWith(
        el,
        expect.anything(),
        expect.objectContaining({ onComplete: done })
      )
    })

    test('clears the inline transform on completion, so the resting rotate/scale classes survive [obligation]', () => {
      slideUpBlurIn(el, done)

      expect(mockFromTo).toHaveBeenCalledWith(
        el,
        expect.anything(),
        expect.objectContaining({ clearProps: 'transform' })
      )
    })
  })

  describe('slideDownBlurOut', () => {
    test('exits downward with blur (positive translateY)', () => {
      slideDownBlurOut(el, done)

      const [, vars] = mockTo.mock.calls[0]
      expect(parseInt(vars.translateY)).toBeGreaterThan(0)
      expect(vars.opacity).toBe(0)
    })

    test('calls done via onComplete', () => {
      slideDownBlurOut(el, done)

      expect(mockTo).toHaveBeenCalledWith(el, expect.objectContaining({ onComplete: done }))
    })
  })
})
