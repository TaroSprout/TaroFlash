import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { makeTimeline, timelines, mockIsTweening, mockSet, mockTo } = vi.hoisted(() => {
  const timelines = []
  function makeTimeline() {
    const state = { calls: { to: [], fromTo: [] } }
    const tl = {
      to: (...args) => {
        state.calls.to.push(args)
        return tl
      },
      fromTo: (...args) => {
        state.calls.fromTo.push(args)
        return tl
      },
      call: () => tl,
      eventCallback: () => tl,
      play: () => tl,
      progress: () => tl,
      kill: () => tl,
      state
    }
    timelines.push(tl)
    return tl
  }
  return {
    makeTimeline,
    timelines,
    mockIsTweening: vi.fn(() => false),
    mockSet: vi.fn(),
    mockTo: vi.fn()
  }
})

vi.mock('gsap', () => ({
  gsap: { set: mockSet, to: mockTo, timeline: () => makeTimeline(), isTweening: mockIsTweening }
}))

const { mockUseMotionStore } = vi.hoisted(() => ({
  mockUseMotionStore: vi.fn(() => ({ factors: { duration: 1 } }))
}))
vi.mock('@/stores/motion', () => ({ useMotionStore: mockUseMotionStore }))

import {
  slideUpFadeIn,
  slideDownFadeOut,
  slideUpFromEdge,
  slideDownToEdge,
  springScaleIn,
  scaleFadeOut,
  recedeModal,
  restoreModal,
  dialogEnterMotion,
  dialogLeaveMotion,
  sheetEnterMotion,
  sheetLeaveMotion,
  popupEnterMotion,
  popupLeaveMotion
} from '@/utils/animations/modal'

const el = document.createElement('div')
const done = vi.fn()

describe('modal animations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    timelines.length = 0
    mockIsTweening.mockReturnValue(false)
    mockUseMotionStore.mockReturnValue({ factors: { duration: 1 } })
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

    test('clears the settled transform so it stops trapping popovers', () => {
      slideUpFadeIn(el, done)

      expect(mockTo).toHaveBeenCalledWith(el, expect.objectContaining({ clearProps: 'transform' }))
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

    test('does not clear props (the receding modal keeps its transform)', () => {
      slideDownFadeOut(el, done)

      const [, vars] = mockTo.mock.calls[0]
      expect(vars.clearProps).toBeUndefined()
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

    test('clears the settled transform so it stops trapping popovers', () => {
      slideUpFromEdge(el, done)

      expect(mockTo).toHaveBeenCalledWith(el, expect.objectContaining({ clearProps: 'transform' }))
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

    test('does not clear props (the receding modal keeps its transform)', () => {
      slideDownToEdge(el, done)

      const [, vars] = mockTo.mock.calls[0]
      expect(vars.clearProps).toBeUndefined()
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

    test('clears the settled transform so it stops trapping popovers', () => {
      springScaleIn(el, done)

      expect(mockTo).toHaveBeenCalledWith(el, expect.objectContaining({ clearProps: 'transform' }))
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

    test('does not clear props (the receding modal keeps its transform)', () => {
      scaleFadeOut(el, done)

      const [, vars] = mockTo.mock.calls[0]
      expect(vars.clearProps).toBeUndefined()
    })

    test('calls done via onComplete', () => {
      scaleFadeOut(el, done)

      expect(mockTo).toHaveBeenCalledWith(el, expect.objectContaining({ onComplete: done }))
    })
  })

  describe('recedeModal', () => {
    test('seeds filter to brightness(1) blur(0px) before tweening', () => {
      recedeModal(el, false)

      expect(mockSet).toHaveBeenCalledWith(el, { filter: 'brightness(1) blur(0px)' })
    })

    test('seeding happens before the tween is issued', () => {
      recedeModal(el, false)

      const setOrder = mockSet.mock.invocationCallOrder[0]
      const toOrder = mockTo.mock.invocationCallOrder[0]
      expect(setOrder).toBeLessThan(toOrder)
    })

    test('tweens scale down (not translateY) and dims/blurs via filter when not pinned', () => {
      recedeModal(el, false)

      const [, vars] = mockTo.mock.calls[0]
      expect(vars).toMatchObject({ scale: 0.9, filter: 'brightness(0.8) blur(2px)' })
      expect(vars).not.toHaveProperty('translateY')
    })

    test('tweens translateY (not scale) and still dims/blurs via filter when pinned', () => {
      recedeModal(el, true)

      const [, vars] = mockTo.mock.calls[0]
      expect(vars).toMatchObject({ translateY: '60px', filter: 'brightness(0.8) blur(2px)' })
      expect(vars).not.toHaveProperty('scale')
    })

    test('does not clear props — a receded modal stays dimmed/blurred until restored', () => {
      recedeModal(el, false)

      const [, vars] = mockTo.mock.calls[0]
      expect(vars.clearProps).toBeUndefined()
    })
  })

  describe('restoreModal', () => {
    test('tweens scale (not translateY) back to full prominence when not pinned', () => {
      restoreModal(el, false)

      const [, vars] = mockTo.mock.calls[0]
      expect(vars).toMatchObject({ scale: 1, filter: 'brightness(1) blur(0px)' })
      expect(vars).not.toHaveProperty('translateY')
    })

    test('tweens translateY (not scale) back to full prominence when pinned', () => {
      restoreModal(el, true)

      const [, vars] = mockTo.mock.calls[0]
      expect(vars).toMatchObject({ translateY: 0, filter: 'brightness(1) blur(0px)' })
      expect(vars).not.toHaveProperty('scale')
    })

    test('clears both the settled transform and filter, unlike recedeModal', () => {
      restoreModal(el, false)

      const [, vars] = mockTo.mock.calls[0]
      expect(vars.clearProps).toBe('transform,filter')
    })
  })

  describe('dialogEnterMotion', () => {
    test('primes 200px below with opacity 0 and tweens to rest with opacity 1', () => {
      dialogEnterMotion(el)

      const [, from, to] = timelines[0].state.calls.fromTo[0]
      expect(from).toEqual({ translateY: '200px', opacity: 0 })
      expect(to).toMatchObject({ translateY: 0, opacity: 1 })
    })
  })

  describe('dialogLeaveMotion', () => {
    test('tweens down to 200px with opacity 0, without a from placement', () => {
      dialogLeaveMotion(el)

      expect(timelines[0].state.calls.fromTo).toHaveLength(0)
      const [, to] = timelines[0].state.calls.to[0]
      expect(to).toMatchObject({ translateY: '200px', opacity: 0 })
    })
  })

  describe('sheetEnterMotion', () => {
    test('primes 100% translateY and tweens to rest, opacity untouched', () => {
      sheetEnterMotion(el)

      const [, from, to] = timelines[0].state.calls.fromTo[0]
      expect(from).toEqual({ translateY: '100%' })
      expect(to).toMatchObject({ translateY: 0 })
      expect(to.opacity).toBeUndefined()
    })
  })

  describe('sheetLeaveMotion', () => {
    test('tweens down to 100% translateY, without a from placement', () => {
      sheetLeaveMotion(el)

      expect(timelines[0].state.calls.fromTo).toHaveLength(0)
      const [, to] = timelines[0].state.calls.to[0]
      expect(to).toMatchObject({ translateY: '100%' })
    })
  })

  describe('popupEnterMotion', () => {
    test('primes scale 0.8 with opacity 0 and tweens to scale 1 opacity 1', () => {
      popupEnterMotion(el)

      const [, from, to] = timelines[0].state.calls.fromTo[0]
      expect(from).toEqual({ scale: 0.8, opacity: 0 })
      expect(to).toMatchObject({ scale: 1, opacity: 1 })
    })
  })

  describe('popupLeaveMotion', () => {
    test('tweens down to scale 0.8 with opacity 0, without a from placement', () => {
      popupLeaveMotion(el)

      expect(timelines[0].state.calls.fromTo).toHaveLength(0)
      const [, to] = timelines[0].state.calls.to[0]
      expect(to).toMatchObject({ scale: 0.8, opacity: 0 })
    })
  })
})
