import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { mockFromTo, mockTo } = vi.hoisted(() => ({
  mockFromTo: vi.fn(),
  mockTo: vi.fn()
}))

vi.mock('gsap', () => ({ gsap: { fromTo: mockFromTo, to: mockTo } }))

import { defaultEnter, defaultLeave, bulkEnter, bulkLeave } from '@/utils/animations/actions-swap'

const el = document.createElement('div')
const done = vi.fn()

describe('actions-swap animations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('defaultEnter', () => {
    test('tweens from scaled-down + faded to settled scale 1', () => {
      defaultEnter(el, done)
      expect(mockFromTo).toHaveBeenCalledWith(
        el,
        expect.objectContaining({ opacity: 0, scale: expect.any(Number) }),
        expect.objectContaining({ opacity: 1, scale: 1 })
      )
    })

    test('starting scale is less than 1 (scales up into place)', () => {
      defaultEnter(el, done)
      expect(mockFromTo.mock.calls[0][1].scale).toBeLessThan(1)
    })

    test('clears transform + opacity after settling', () => {
      defaultEnter(el, done)
      expect(mockFromTo.mock.calls[0][2].clearProps).toMatch(/transform/)
    })

    test('forwards done via onComplete', () => {
      defaultEnter(el, done)
      expect(mockFromTo.mock.calls[0][2].onComplete).toBe(done)
    })
  })

  describe('defaultLeave', () => {
    test('tweens to faded + scaled-down', () => {
      defaultLeave(el, done)
      expect(mockTo).toHaveBeenCalledWith(
        el,
        expect.objectContaining({ opacity: 0, scale: expect.any(Number) })
      )
      expect(mockTo.mock.calls[0][1].scale).toBeLessThan(1)
    })

    test('forwards done via onComplete', () => {
      defaultLeave(el, done)
      expect(mockTo.mock.calls[0][1].onComplete).toBe(done)
    })

    test('does not call fromTo', () => {
      defaultLeave(el, done)
      expect(mockFromTo).not.toHaveBeenCalled()
    })
  })

  describe('bulkEnter', () => {
    test('tweens from positive y offset + faded to settled y 0', () => {
      bulkEnter(el, done)
      expect(mockFromTo).toHaveBeenCalledWith(
        el,
        expect.objectContaining({ opacity: 0, y: expect.any(Number) }),
        expect.objectContaining({ opacity: 1, y: 0 })
      )
      expect(mockFromTo.mock.calls[0][1].y).toBeGreaterThan(0)
    })

    test('forwards done via onComplete', () => {
      bulkEnter(el, done)
      expect(mockFromTo.mock.calls[0][2].onComplete).toBe(done)
    })
  })

  describe('bulkLeave', () => {
    test('tweens to faded + positive y offset (slides back down)', () => {
      bulkLeave(el, done)
      expect(mockTo).toHaveBeenCalledWith(
        el,
        expect.objectContaining({ opacity: 0, y: expect.any(Number) })
      )
      expect(mockTo.mock.calls[0][1].y).toBeGreaterThan(0)
    })

    test('forwards done via onComplete', () => {
      bulkLeave(el, done)
      expect(mockTo.mock.calls[0][1].onComplete).toBe(done)
    })
  })

  test('all four use positive duration', () => {
    defaultEnter(el, done)
    defaultLeave(el, done)
    bulkEnter(el, done)
    bulkLeave(el, done)
    expect(mockFromTo.mock.calls.every((c) => c[2].duration > 0)).toBe(true)
    expect(mockTo.mock.calls.every((c) => c[1].duration > 0)).toBe(true)
  })
})
