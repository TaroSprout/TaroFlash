import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { mockFromTo, mockTo } = vi.hoisted(() => ({
  mockFromTo: vi.fn(),
  mockTo: vi.fn()
}))

vi.mock('gsap', () => ({ gsap: { fromTo: mockFromTo, to: mockTo } }))

import { slideFadeRightEnter, slideFadeRightLeave } from '@/utils/animations/slide-fade-right'

const el = document.createElement('div')
const done = vi.fn()

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
