import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { mockFromTo, mockTo } = vi.hoisted(() => ({
  mockFromTo: vi.fn(),
  mockTo: vi.fn()
}))

vi.mock('gsap', () => ({ gsap: { fromTo: mockFromTo, to: mockTo } }))

import {
  scaleFadeEnter,
  scaleFadeLeave,
  riseFadeEnter,
  riseFadeLeave
} from '@/utils/animations/actions-swap'

const el = document.createElement('div')
const done = vi.fn()

describe('actions-swap animations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('scaleFadeEnter', () => {
    test('tweens from scaled-down + faded to settled scale 1', () => {
      scaleFadeEnter(el, done)
      expect(mockFromTo).toHaveBeenCalledWith(
        el,
        expect.objectContaining({ opacity: 0, scale: expect.any(Number) }),
        expect.objectContaining({ opacity: 1, scale: 1 })
      )
    })

    test('starting scale is less than 1 (scales up into place)', () => {
      scaleFadeEnter(el, done)
      expect(mockFromTo.mock.calls[0][1].scale).toBeLessThan(1)
    })

    test('clears transform + opacity after settling', () => {
      scaleFadeEnter(el, done)
      expect(mockFromTo.mock.calls[0][2].clearProps).toMatch(/transform/)
    })

    test('forwards done via onComplete', () => {
      scaleFadeEnter(el, done)
      expect(mockFromTo.mock.calls[0][2].onComplete).toBe(done)
    })
  })

  describe('scaleFadeLeave', () => {
    test('tweens to faded + scaled-down', () => {
      scaleFadeLeave(el, done)
      expect(mockTo).toHaveBeenCalledWith(
        el,
        expect.objectContaining({ opacity: 0, scale: expect.any(Number) })
      )
      expect(mockTo.mock.calls[0][1].scale).toBeLessThan(1)
    })

    test('forwards done via onComplete', () => {
      scaleFadeLeave(el, done)
      expect(mockTo.mock.calls[0][1].onComplete).toBe(done)
    })

    test('does not call fromTo', () => {
      scaleFadeLeave(el, done)
      expect(mockFromTo).not.toHaveBeenCalled()
    })
  })

  describe('riseFadeEnter', () => {
    test('tweens from positive y offset + faded to settled y 0', () => {
      riseFadeEnter(el, done)
      expect(mockFromTo).toHaveBeenCalledWith(
        el,
        expect.objectContaining({ opacity: 0, y: expect.any(Number) }),
        expect.objectContaining({ opacity: 1, y: 0 })
      )
      expect(mockFromTo.mock.calls[0][1].y).toBeGreaterThan(0)
    })

    test('forwards done via onComplete', () => {
      riseFadeEnter(el, done)
      expect(mockFromTo.mock.calls[0][2].onComplete).toBe(done)
    })
  })

  describe('riseFadeLeave', () => {
    test('tweens to faded + positive y offset (slides back down)', () => {
      riseFadeLeave(el, done)
      expect(mockTo).toHaveBeenCalledWith(
        el,
        expect.objectContaining({ opacity: 0, y: expect.any(Number) })
      )
      expect(mockTo.mock.calls[0][1].y).toBeGreaterThan(0)
    })

    test('forwards done via onComplete', () => {
      riseFadeLeave(el, done)
      expect(mockTo.mock.calls[0][1].onComplete).toBe(done)
    })
  })

  test('all four use positive duration', () => {
    scaleFadeEnter(el, done)
    scaleFadeLeave(el, done)
    riseFadeEnter(el, done)
    riseFadeLeave(el, done)
    expect(mockFromTo.mock.calls.every((c) => c[2].duration > 0)).toBe(true)
    expect(mockTo.mock.calls.every((c) => c[1].duration > 0)).toBe(true)
  })
})
