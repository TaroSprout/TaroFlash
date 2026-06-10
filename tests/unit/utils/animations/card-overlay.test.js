import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { mockSet, mockTo, mockFromTo } = vi.hoisted(() => ({
  mockSet: vi.fn(),
  mockTo: vi.fn(),
  mockFromTo: vi.fn()
}))

vi.mock('gsap', () => ({ gsap: { set: mockSet, to: mockTo, fromTo: mockFromTo } }))

import {
  captureModeSwitch,
  distanceToViewportBottom,
  fadeScaleEnter,
  fadeScaleLeave,
  primeOverlayBelow,
  slideOverlayUp,
  settleOverlay,
  slideOverlayDown
} from '@/utils/animations/deck-view/card-overlay'

const el = document.createElement('div')
const done = vi.fn()

/** Build a ModeSwitchViewport with sensible defaults. */
function makeVp({ from_y = 0, settle_y = 0, stack_top = 600 } = {}) {
  return { from_y, settle_y, stack_top }
}

describe('card-overlay animations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset scroll/viewport so tests that mock window see consistent values
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true })
    Object.defineProperty(window, 'innerHeight', {
      value: 800,
      configurable: true,
      writable: true
    })
  })

  // ── captureModeSwitch ─────────────────────────────────────────────────────

  describe('captureModeSwitch', () => {
    function makeStack(rectTop = 200) {
      const el = document.createElement('div')
      el.getBoundingClientRect = () => ({
        top: rectTop,
        bottom: rectTop + 500,
        left: 0,
        right: 0,
        width: 0,
        height: 500,
        x: 0,
        y: rectTop,
        toJSON: () => ({})
      })
      return el
    }

    function makeHeader(rectBottom = 60) {
      const el = document.createElement('div')
      el.getBoundingClientRect = () => ({
        top: 0,
        bottom: rectBottom,
        left: 0,
        right: 0,
        width: 0,
        height: rectBottom,
        x: 0,
        y: 0,
        toJSON: () => ({})
      })
      return el
    }

    test('above-stack regime: settle_y === from_y when user is scrolled above the stack [obligation]', () => {
      // from_y=50, stack_top=50+200=250, header_bottom=60 → stack_top-header_bottom=190
      // min(50, max(0,190)) = min(50,190) = 50 → settle_y === from_y
      window.scrollY = 50
      const stack = makeStack(200) // rect.top=200, stack_top = 200+50=250
      const header = makeHeader(60)
      const vp = captureModeSwitch(stack, header)
      expect(vp.settle_y).toBe(vp.from_y)
    })

    test('deep-scroll regime: settle_y === stack_top - header_bottom when scrolled past stack [obligation]', () => {
      // from_y=600, rect.top at scroll 600 is -200 (stack_top absolute=400), header_bottom=60
      // max(0, 400-60)=340, min(600,340)=340 → settle_y = stack_top - header_bottom
      window.scrollY = 600
      const stack = makeStack(-200) // rect.top=-200 → stack_top = -200+600=400
      const header = makeHeader(60)
      const vp = captureModeSwitch(stack, header)
      expect(vp.settle_y).toBe(400 - 60) // stack_top - header_bottom
    })

    test('with no header, header_bottom defaults to 0', () => {
      window.scrollY = 0
      const stack = makeStack(100) // stack_top=100
      const vp = captureModeSwitch(stack, null)
      // min(0, max(0, 100-0)) = min(0, 100) = 0
      expect(vp.settle_y).toBe(0)
    })

    test('with no header, settle_y clamps to 0 when stack_top is above viewport', () => {
      window.scrollY = 0
      const stack = makeStack(-50) // stack_top = -50
      const vp = captureModeSwitch(stack, undefined)
      // max(0, -50) = 0, min(0, 0) = 0
      expect(vp.settle_y).toBe(0)
    })

    test('returns from_y and stack_top in the viewport context', () => {
      window.scrollY = 100
      const stack = makeStack(50) // stack_top = 50+100=150
      const vp = captureModeSwitch(stack)
      expect(vp.from_y).toBe(100)
      expect(vp.stack_top).toBe(150)
    })
  })

  // ── distanceToViewportBottom ──────────────────────────────────────────────

  describe('distanceToViewportBottom', () => {
    test('returns settle_y + innerHeight - stack_top when positive [obligation]', () => {
      window.innerHeight = 800
      // settle_y=0, stack_top=600 → 0+800-600=200
      const vp = makeVp({ settle_y: 0, stack_top: 600 })
      expect(distanceToViewportBottom(vp)).toBe(200)
    })

    test('clamps to 0 when stack_top is below viewport bottom [obligation]', () => {
      window.innerHeight = 800
      // settle_y=0, stack_top=900 → 0+800-900=-100 → clamped to 0
      const vp = makeVp({ settle_y: 0, stack_top: 900 })
      expect(distanceToViewportBottom(vp)).toBe(0)
    })

    test('accounts for settle_y offset', () => {
      window.innerHeight = 800
      // settle_y=200, stack_top=800 → 200+800-800=200
      const vp = makeVp({ settle_y: 200, stack_top: 800 })
      expect(distanceToViewportBottom(vp)).toBe(200)
    })
  })

  // ── fadeScaleEnter (grid) ─────────────────────────────────────────────────

  describe('fadeScaleEnter (grid)', () => {
    test('fades + scales in from a shrunk, top-anchored state, staying in flow', () => {
      fadeScaleEnter(el, done)

      expect(mockFromTo).toHaveBeenCalledWith(
        el,
        { opacity: 0, scale: 0.95, transformOrigin: 'top center' },
        expect.objectContaining({ opacity: 1, scale: 1, onComplete: done })
      )
    })

    test('clears leftover positioning AND transform so the entering grid rejoins flow', () => {
      fadeScaleEnter(el, done)

      expect(mockSet).toHaveBeenCalledWith(el, {
        clearProps: 'position,top,left,width,transform'
      })
    })
  })

  // ── fadeScaleLeave (grid) ─────────────────────────────────────────────────

  describe('fadeScaleLeave (grid)', () => {
    test('drops the leaving grid out of flow with scroll compensation y', () => {
      // from_y=200, settle_y=100 → scrollCompensation = 100-200 = -100
      const vp = makeVp({ from_y: 200, settle_y: 100 })
      fadeScaleLeave(el, vp, done)

      expect(mockSet).toHaveBeenCalledWith(el, {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        y: -100
      })
    })

    test('fades to 0 and scales down from the top, calling done on complete', () => {
      const vp = makeVp()
      fadeScaleLeave(el, vp, done)

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

    test('scroll compensation is 0 when from_y === settle_y (no scroll jump)', () => {
      const vp = makeVp({ from_y: 300, settle_y: 300 })
      fadeScaleLeave(el, vp, done)
      expect(mockSet).toHaveBeenCalledWith(el, expect.objectContaining({ y: 0 }))
    })
  })

  // ── primeOverlayBelow ─────────────────────────────────────────────────────

  describe('primeOverlayBelow', () => {
    test('layers the entering pane in flow, positioned at distanceToViewportBottom', () => {
      window.innerHeight = 800
      // settle_y=0, stack_top=600 → distanceToViewportBottom = 200
      const vp = makeVp({ settle_y: 0, stack_top: 600 })
      primeOverlayBelow(el, vp)

      expect(mockSet).toHaveBeenCalledWith(el, {
        position: 'relative',
        zIndex: 1,
        y: 200
      })
    })

    test('does not call gsap.to (priming only sets initial state)', () => {
      primeOverlayBelow(el, makeVp())
      expect(mockTo).not.toHaveBeenCalled()
    })
  })

  // ── slideOverlayUp ────────────────────────────────────────────────────────

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

  // ── settleOverlay ─────────────────────────────────────────────────────────

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

  // ── slideOverlayDown ──────────────────────────────────────────────────────

  describe('slideOverlayDown', () => {
    test('drops the leaving pane out of flow with scroll compensation y', () => {
      // from_y=200, settle_y=100 → scrollCompensation = -100
      const vp = makeVp({ from_y: 200, settle_y: 100 })
      slideOverlayDown(el, vp, done)

      expect(mockSet).toHaveBeenCalledWith(el, {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        zIndex: 1,
        y: -100
      })
    })

    test('tweens y down by one innerHeight from the compensation starting point', () => {
      window.innerHeight = 800
      // from_y=100, settle_y=100 → scrollCompensation=0 → tween to 0+800=800
      const vp = makeVp({ from_y: 100, settle_y: 100 })
      slideOverlayDown(el, vp, done)

      expect(mockTo).toHaveBeenCalledWith(el, expect.objectContaining({ y: 800 }))
    })

    test('opacity stays 1 when scrollCompensation >= 0 (pane top already off-screen) [obligation]', () => {
      // from_y=100, settle_y=100 → compensation=0 → opacity=1 (no early fade)
      const vp = makeVp({ from_y: 100, settle_y: 100 })
      slideOverlayDown(el, vp, done)

      const opts = mockTo.mock.calls[0][1]
      expect(opts.opacity).toBe(1)
    })

    test('opacity is 0 when scrollCompensation < 0 (pane top cannot clear screen in one viewport) [obligation]', () => {
      // from_y=200, settle_y=100 → compensation=-100 → opacity=0
      const vp = makeVp({ from_y: 200, settle_y: 100 })
      slideOverlayDown(el, vp, done)

      const opts = mockTo.mock.calls[0][1]
      expect(opts.opacity).toBe(0)
    })

    test('calls done via onComplete', () => {
      slideOverlayDown(el, makeVp(), done)

      expect(mockTo).toHaveBeenCalledWith(el, expect.objectContaining({ onComplete: done }))
    })

    test('uses the shared duration and expo.out ease', () => {
      slideOverlayDown(el, makeVp(), done)

      const opts = mockTo.mock.calls[0][1]
      expect(opts.duration).toBeGreaterThan(0)
      expect(opts.ease).toBe('expo.out')
    })
  })

  test('slideOverlayUp and slideOverlayDown share the same duration', () => {
    slideOverlayUp(el, done)
    slideOverlayDown(el, makeVp(), done)

    expect(mockTo.mock.calls[0][1].duration).toBe(mockTo.mock.calls[1][1].duration)
  })
})
