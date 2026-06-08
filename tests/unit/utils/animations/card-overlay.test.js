import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { mockSet, mockTo } = vi.hoisted(() => ({
  mockSet: vi.fn(),
  mockTo: vi.fn()
}))

vi.mock('gsap', () => ({ gsap: { set: mockSet, to: mockTo } }))

import {
  primeOverlayBelow,
  slideOverlayUp,
  settleOverlay,
  slideOverlayDown
} from '@/utils/animations/deck-view/card-overlay'

const el = document.createElement('div')
const done = vi.fn()

describe('card-overlay animations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('primeOverlayBelow', () => {
    test('lifts the entering pane out of flow, 100% below its rest position', () => {
      primeOverlayBelow(el)

      expect(mockSet).toHaveBeenCalledWith(el, {
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        translateY: '100%'
      })
    })

    test('does not call gsap.to (priming only sets initial state)', () => {
      primeOverlayBelow(el)

      expect(mockTo).not.toHaveBeenCalled()
    })
  })

  describe('slideOverlayUp', () => {
    test('tweens to translateY 0', () => {
      slideOverlayUp(el, done)

      expect(mockTo).toHaveBeenCalledWith(el, expect.objectContaining({ translateY: 0 }))
    })

    test('uses the shared duration and expo.out ease', () => {
      slideOverlayUp(el, done)

      const opts = mockTo.mock.calls[0][1]
      expect(opts.duration).toBeGreaterThan(0)
      expect(opts.ease).toBe('expo.out')
    })

    test('calls done via onComplete', () => {
      slideOverlayUp(el, done)

      expect(mockTo).toHaveBeenCalledWith(el, expect.objectContaining({ onComplete: done }))
    })

    test('does not prime with gsap.set (enter is primed separately)', () => {
      slideOverlayUp(el, done)

      expect(mockSet).not.toHaveBeenCalled()
    })
  })

  describe('settleOverlay', () => {
    test('clears the overlay props so the entered pane rejoins normal flow', () => {
      settleOverlay(el)

      expect(mockSet).toHaveBeenCalledWith(el, { clearProps: 'position,inset,zIndex,transform' })
    })

    test('does not call gsap.to (settling only resets state)', () => {
      settleOverlay(el)

      expect(mockTo).not.toHaveBeenCalled()
    })
  })

  describe('slideOverlayDown', () => {
    test('tweens back to 100% below', () => {
      slideOverlayDown(el, done)

      expect(mockTo).toHaveBeenCalledWith(el, expect.objectContaining({ translateY: '100%' }))
    })

    test('uses the shared duration and expo.out ease', () => {
      slideOverlayDown(el, done)

      const opts = mockTo.mock.calls[0][1]
      expect(opts.duration).toBeGreaterThan(0)
      expect(opts.ease).toBe('expo.out')
    })

    test('calls done via onComplete', () => {
      slideOverlayDown(el, done)

      expect(mockTo).toHaveBeenCalledWith(el, expect.objectContaining({ onComplete: done }))
    })

    test('does not prime with gsap.set (leave animation)', () => {
      slideOverlayDown(el, done)

      expect(mockSet).not.toHaveBeenCalled()
    })
  })

  test('slideOverlayUp and slideOverlayDown share the same duration', () => {
    slideOverlayUp(el, done)
    slideOverlayDown(el, done)

    expect(mockTo.mock.calls[0][1].duration).toBe(mockTo.mock.calls[1][1].duration)
  })
})
