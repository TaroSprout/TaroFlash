import { describe, test, expect, beforeEach, afterEach } from 'vite-plus/test'
import { scanPerf } from '@/utils/motion/perf-scan'

// jsdom doesn't implement `backdrop-filter` in its CSSOM at all (`getComputedStyle`
// returns `undefined` rather than `'none'`), so this needs a real browser to see
// scanPerf's computed-style branches behave as they do in production.

const VIEWPORT_WIDTH = 1000
const VIEWPORT_HEIGHT = 800

function makeElement({ rect, className = '', style = {} }) {
  const el = document.createElement('div')
  el.className = className
  Object.assign(el.style, style)
  el.getBoundingClientRect = () => ({
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    ...rect
  })
  document.body.appendChild(el)
  return el
}

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', { value: VIEWPORT_WIDTH, configurable: true })
  Object.defineProperty(window, 'innerHeight', { value: VIEWPORT_HEIGHT, configurable: true })
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('scanPerf', () => {
  test('counts an on-screen element with a bgx-* class as a standing effect', () => {
    makeElement({
      className: 'bgx-dot-grid',
      rect: { width: 100, height: 50, top: 0, left: 0, right: 100, bottom: 50 }
    })

    const snapshot = scanPerf(document.body)

    expect(snapshot.onScreenElementCount).toBe(1)
    expect(snapshot.standingEffectAreaRatio).toBeCloseTo(
      (100 * 50) / (VIEWPORT_WIDTH * VIEWPORT_HEIGHT)
    )
  })

  test('counts an on-screen element with a computed backdrop-filter as a standing effect', () => {
    makeElement({
      style: { backdropFilter: 'blur(8px)' },
      rect: { width: 100, height: 50, top: 0, left: 0, right: 100, bottom: 50 }
    })

    const snapshot = scanPerf(document.body)

    expect(snapshot.onScreenElementCount).toBe(1)
    expect(snapshot.standingEffectAreaRatio).toBeGreaterThan(0)
  })

  test('counts an on-screen element with an infinite CSS animation as a standing effect', () => {
    makeElement({
      style: { animationName: 'pulse', animationIterationCount: 'infinite' },
      rect: { width: 100, height: 50, top: 0, left: 0, right: 100, bottom: 50 }
    })

    const snapshot = scanPerf(document.body)

    expect(snapshot.onScreenElementCount).toBe(1)
    expect(snapshot.standingEffectAreaRatio).toBeGreaterThan(0)
  })

  test('does not count a finite (non-looping) CSS animation as a standing effect', () => {
    makeElement({
      style: { animationName: 'fade-in', animationIterationCount: '1' },
      rect: { width: 100, height: 50, top: 0, left: 0, right: 100, bottom: 50 }
    })

    const snapshot = scanPerf(document.body)

    expect(snapshot.onScreenElementCount).toBe(1)
    expect(snapshot.standingEffectAreaRatio).toBe(0)
  })

  test('excludes an off-screen element from both the element count and the effect area', () => {
    makeElement({
      className: 'bgx-dot-grid',
      rect: { width: 100, height: 50, top: -200, left: 0, right: 100, bottom: -150 }
    })

    const snapshot = scanPerf(document.body)

    expect(snapshot.onScreenElementCount).toBe(0)
    expect(snapshot.standingEffectAreaRatio).toBe(0)
  })

  test('counts a plain on-screen element without adding to the effect area', () => {
    makeElement({
      rect: { width: 100, height: 50, top: 0, left: 0, right: 100, bottom: 50 }
    })

    const snapshot = scanPerf(document.body)

    expect(snapshot.onScreenElementCount).toBe(1)
    expect(snapshot.standingEffectAreaRatio).toBe(0)
  })
})
