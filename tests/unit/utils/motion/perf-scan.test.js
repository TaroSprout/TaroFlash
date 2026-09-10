import { describe, test, expect, beforeEach, afterEach } from 'vite-plus/test'
import { scanPerf } from '@/utils/motion/perf-scan'

const VIEWPORT_WIDTH = 1000
const VIEWPORT_HEIGHT = 800

function makeElement({ rect }) {
  const el = document.createElement('div')
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
  test('counts a plain on-screen element', () => {
    makeElement({ rect: { width: 100, height: 50, top: 0, left: 0, right: 100, bottom: 50 } })

    const snapshot = scanPerf(document.body)

    expect(snapshot.onScreenElementCount).toBe(1)
  })

  test('excludes an off-screen element from the count', () => {
    makeElement({
      rect: { width: 100, height: 50, top: -200, left: 0, right: 100, bottom: -150 }
    })

    const snapshot = scanPerf(document.body)

    expect(snapshot.onScreenElementCount).toBe(0)
  })

  test('excludes a zero-size element from the count', () => {
    makeElement({ rect: { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 } })

    const snapshot = scanPerf(document.body)

    expect(snapshot.onScreenElementCount).toBe(0)
  })

  test('counts every matching element under the given root', () => {
    makeElement({ rect: { width: 10, height: 10, top: 0, left: 0, right: 10, bottom: 10 } })
    makeElement({ rect: { width: 10, height: 10, top: 20, left: 0, right: 10, bottom: 30 } })

    const snapshot = scanPerf(document.body)

    expect(snapshot.onScreenElementCount).toBe(2)
  })
})
