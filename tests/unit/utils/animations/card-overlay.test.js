import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { mockSet, mockTo, mockFromTo } = vi.hoisted(() => ({
  mockSet: vi.fn(),
  mockTo: vi.fn(),
  mockFromTo: vi.fn()
}))

vi.mock('gsap', () => ({ gsap: { set: mockSet, to: mockTo, fromTo: mockFromTo } }))

import {
  fadeScaleEnter,
  fadeScaleLeave,
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

  describe('fadeScaleEnter (grid)', () => {
    test('fades + scales in from a shrunk, top-anchored state, staying in flow', () => {
      fadeScaleEnter(el, done)

      expect(mockFromTo).toHaveBeenCalledWith(
        el,
        { opacity: 0, scale: 0.95, transformOrigin: 'top center' },
        expect.objectContaining({ opacity: 1, scale: 1, onComplete: done })
      )
    })

    test('does not take the entering grid out of flow', () => {
      fadeScaleEnter(el, done)

      expect(mockSet).not.toHaveBeenCalled()
    })
  })

  describe('fadeScaleLeave (grid)', () => {
    test('drops the leaving grid out of flow before shrinking it', () => {
      fadeScaleLeave(el, done)

      expect(mockSet).toHaveBeenCalledWith(el, {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%'
      })
    })

    test('fades to 0 and scales down from the top, calling done on complete', () => {
      fadeScaleLeave(el, done)

      expect(mockTo).toHaveBeenCalledWith(
        el,
        expect.objectContaining({
          opacity: 0,
          scale: 0.95,
          transformOrigin: 'top center',
          onComplete: done
        })
      )
    })
  })

  describe('primeOverlayBelow', () => {
    test('layers the entering pane in flow, one screen below its rest position', () => {
      primeOverlayBelow(el)

      expect(mockSet).toHaveBeenCalledWith(el, {
        position: 'relative',
        zIndex: 1,
        y: window.innerHeight
      })
    })

    test('does not call gsap.to (priming only sets initial state)', () => {
      primeOverlayBelow(el)

      expect(mockTo).not.toHaveBeenCalled()
    })
  })

  describe('slideOverlayUp', () => {
    test('tweens to y 0', () => {
      slideOverlayUp(el, done)

      expect(mockTo).toHaveBeenCalledWith(el, expect.objectContaining({ y: 0 }))
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

      expect(mockSet).toHaveBeenCalledWith(el, { clearProps: 'position,zIndex,transform' })
    })

    test('does not call gsap.to (settling only resets state)', () => {
      settleOverlay(el)

      expect(mockTo).not.toHaveBeenCalled()
    })
  })

  describe('slideOverlayDown', () => {
    test('drops the leaving pane out of flow (on top) before sliding it down', () => {
      slideOverlayDown(el, done)

      expect(mockSet).toHaveBeenCalledWith(el, {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        zIndex: 1
      })
    })

    test('tweens down one screen', () => {
      slideOverlayDown(el, done)

      expect(mockTo).toHaveBeenCalledWith(el, expect.objectContaining({ y: window.innerHeight }))
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
  })

  test('slideOverlayUp and slideOverlayDown share the same duration', () => {
    slideOverlayUp(el, done)
    slideOverlayDown(el, done)

    expect(mockTo.mock.calls[0][1].duration).toBe(mockTo.mock.calls[1][1].duration)
  })
})
