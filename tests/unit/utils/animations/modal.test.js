import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { mockSet, mockTo } = vi.hoisted(() => ({
  mockSet: vi.fn(),
  mockTo: vi.fn()
}))

vi.mock('gsap', () => ({ gsap: { set: mockSet, to: mockTo } }))

import {
  slideUpFadeIn,
  slideDownFadeOut,
  slideUpFromEdge,
  slideDownToEdge,
  springScaleIn,
  scaleFadeOut,
  recedeModal,
  restoreModal
} from '@/utils/animations/modal'

const el = document.createElement('div')
const done = vi.fn()

describe('modal animations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('slideUpFadeIn', () => {
    test('primes initial state at 200px below with opacity 0', () => {
      slideUpFadeIn(el, done)

      expect(mockSet).toHaveBeenCalledWith(el, { translateY: '200px', opacity: 0 })
    })

    test('tweens to rest position with opacity 1', () => {
      slideUpFadeIn(el, done)

      expect(mockTo).toHaveBeenCalledWith(
        el,
        expect.objectContaining({ translateY: 0, opacity: 1 })
      )
    })

    test('applies a settle delay before tweening', () => {
      slideUpFadeIn(el, done)

      expect(mockTo).toHaveBeenCalledWith(
        el,
        expect.objectContaining({ delay: expect.any(Number) })
      )
      const { delay } = mockTo.mock.calls[0][1]
      expect(delay).toBeGreaterThan(0)
    })

    test('calls done via onComplete', () => {
      slideUpFadeIn(el, done)

      expect(mockTo).toHaveBeenCalledWith(el, expect.objectContaining({ onComplete: done }))
    })
  })

  describe('slideDownFadeOut', () => {
    test('slides out 200px downward with fade', () => {
      slideDownFadeOut(el, done)

      expect(mockTo).toHaveBeenCalledWith(
        el,
        expect.objectContaining({ translateY: '200px', opacity: 0 })
      )
    })

    test('does not prime with gsap.set (leave animation)', () => {
      slideDownFadeOut(el, done)

      expect(mockSet).not.toHaveBeenCalled()
    })

    test('calls done via onComplete', () => {
      slideDownFadeOut(el, done)

      expect(mockTo).toHaveBeenCalledWith(el, expect.objectContaining({ onComplete: done }))
    })
  })

  describe('slideUpFromEdge', () => {
    test('primes initial state at 100% translateY', () => {
      slideUpFromEdge(el, done)

      expect(mockSet).toHaveBeenCalledWith(el, { translateY: '100%' })
    })

    test('tweens to rest position', () => {
      slideUpFromEdge(el, done)

      expect(mockTo).toHaveBeenCalledWith(el, expect.objectContaining({ translateY: 0 }))
    })

    test('applies a settle delay before tweening', () => {
      slideUpFromEdge(el, done)

      const { delay } = mockTo.mock.calls[0][1]
      expect(delay).toBeGreaterThan(0)
    })

    test('calls done via onComplete', () => {
      slideUpFromEdge(el, done)

      expect(mockTo).toHaveBeenCalledWith(el, expect.objectContaining({ onComplete: done }))
    })
  })

  describe('slideDownToEdge', () => {
    test('slides out to 100% translateY', () => {
      slideDownToEdge(el, done)

      expect(mockTo).toHaveBeenCalledWith(el, expect.objectContaining({ translateY: '100%' }))
    })

    test('does not prime with gsap.set (leave animation)', () => {
      slideDownToEdge(el, done)

      expect(mockSet).not.toHaveBeenCalled()
    })

    test('calls done via onComplete', () => {
      slideDownToEdge(el, done)

      expect(mockTo).toHaveBeenCalledWith(el, expect.objectContaining({ onComplete: done }))
    })
  })

  describe('springScaleIn', () => {
    test('primes initial state at scale 0.8 with opacity 0', () => {
      springScaleIn(el, done)

      expect(mockSet).toHaveBeenCalledWith(el, { scale: 0.8, opacity: 0 })
    })

    test('tweens to scale 1 with opacity 1 using spring ease', () => {
      springScaleIn(el, done)

      expect(mockTo).toHaveBeenCalledWith(
        el,
        expect.objectContaining({ scale: 1, opacity: 1, ease: 'back.out(1.7)' })
      )
    })

    test('applies a settle delay before tweening', () => {
      springScaleIn(el, done)

      const { delay } = mockTo.mock.calls[0][1]
      expect(delay).toBeGreaterThan(0)
    })

    test('calls done via onComplete', () => {
      springScaleIn(el, done)

      expect(mockTo).toHaveBeenCalledWith(el, expect.objectContaining({ onComplete: done }))
    })
  })

  describe('scaleFadeOut', () => {
    test('scales out to 0.8 with fade', () => {
      scaleFadeOut(el, done)

      expect(mockTo).toHaveBeenCalledWith(el, expect.objectContaining({ scale: 0.8, opacity: 0 }))
    })

    test('does not prime with gsap.set (leave animation)', () => {
      scaleFadeOut(el, done)

      expect(mockSet).not.toHaveBeenCalled()
    })

    test('calls done via onComplete', () => {
      scaleFadeOut(el, done)

      expect(mockTo).toHaveBeenCalledWith(el, expect.objectContaining({ onComplete: done }))
    })
  })

  describe('recedeModal', () => {
    test('[obligation] seeds filter to brightness(1) blur(0px) before tweening', () => {
      recedeModal(el, false)

      expect(mockSet).toHaveBeenCalledWith(el, { filter: 'brightness(1) blur(0px)' })
    })

    test('[obligation] seeding happens before the tween is issued', () => {
      recedeModal(el, false)

      const setOrder = mockSet.mock.invocationCallOrder[0]
      const toOrder = mockTo.mock.invocationCallOrder[0]
      expect(setOrder).toBeLessThan(toOrder)
    })

    test('[obligation] tweens scale down (not translateY) and dims/blurs via filter when not pinned', () => {
      recedeModal(el, false)

      const [, vars] = mockTo.mock.calls[0]
      expect(vars).toMatchObject({ scale: 0.9, filter: 'brightness(0.8) blur(2px)' })
      expect(vars).not.toHaveProperty('translateY')
    })

    test('[obligation] tweens translateY (not scale) and still dims/blurs via filter when pinned', () => {
      recedeModal(el, true)

      const [, vars] = mockTo.mock.calls[0]
      expect(vars).toMatchObject({ translateY: '60px', filter: 'brightness(0.8) blur(2px)' })
      expect(vars).not.toHaveProperty('scale')
    })

    test('disables pointer events while receded', () => {
      recedeModal(el, false)

      expect(mockTo).toHaveBeenCalledWith(el, expect.objectContaining({ pointerEvents: 'none' }))
    })
  })

  describe('restoreModal', () => {
    test('[obligation] seeds pointerEvents to auto before tweening', () => {
      restoreModal(el, false)

      expect(mockSet).toHaveBeenCalledWith(el, { pointerEvents: 'auto' })
    })

    test('[obligation] tweens scale (not translateY) back to full prominence when not pinned', () => {
      restoreModal(el, false)

      const [, vars] = mockTo.mock.calls[0]
      expect(vars).toMatchObject({ scale: 1, filter: 'brightness(1) blur(0px)' })
      expect(vars).not.toHaveProperty('translateY')
    })

    test('[obligation] tweens translateY (not scale) back to full prominence when pinned', () => {
      restoreModal(el, true)

      const [, vars] = mockTo.mock.calls[0]
      expect(vars).toMatchObject({ translateY: 0, filter: 'brightness(1) blur(0px)' })
      expect(vars).not.toHaveProperty('scale')
    })
  })
})
