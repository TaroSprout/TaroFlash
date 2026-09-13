import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { mockSet, mockTo } = vi.hoisted(() => ({
  mockSet: vi.fn(),
  mockTo: vi.fn(() => ({ kill: vi.fn() }))
}))

vi.mock('gsap', () => ({
  gsap: {
    set: mockSet,
    to: mockTo
  }
}))

import { moveReaderCursor, hideReaderCursor } from '@/utils/animations/reader-cursor'

function makeEl() {
  return document.createElement('div')
}

const BOX_A = { left: 10, top: 20, width: 50, height: 15 }
const BOX_B = { left: 30, top: 45, width: 60, height: 20 }

describe('moveReaderCursor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('first call snaps the real box instantly and marks it visible with gsap.set, no tween', () => {
    const el = makeEl()
    moveReaderCursor(el, BOX_A)

    expect(el.style.left).toBe('10px')
    expect(el.style.top).toBe('20px')
    expect(el.style.width).toBe('50px')
    expect(el.style.height).toBe('15px')
    expect(el.style.transform).toBe('none')
    expect(mockSet).toHaveBeenCalledWith(el, { autoAlpha: 1 })
    expect(mockTo).not.toHaveBeenCalled()
  })

  test('a subsequent move snaps real geometry instantly and eases a transform-only delta tween to identity', () => {
    const el = makeEl()
    moveReaderCursor(el, BOX_A)
    mockSet.mockClear()

    moveReaderCursor(el, BOX_B, { duration: 0.05 })

    expect(el.style.left).toBe('30px') // The real box is the new target instantly, never tweened.
    expect(el.style.top).toBe('45px')
    expect(el.style.width).toBe('60px')
    expect(el.style.height).toBe('20px')
    expect(mockSet).not.toHaveBeenCalled()

    const dx = BOX_A.left - BOX_B.left
    const dy = BOX_A.top - BOX_B.top
    const sx = BOX_A.width / BOX_B.width
    const sy = BOX_A.height / BOX_B.height
    // Painted synchronously, before either tween ticks, purely via `transform`.
    expect(el.style.transform).toBe(`translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`)

    expect(mockTo).toHaveBeenCalledTimes(2) // Two tweens: the element's autoAlpha, and the delta.
    const elCall = mockTo.mock.calls.find((call) => call[0] === el)
    expect(elCall[1]).toMatchObject({ autoAlpha: 1, duration: 0.05 })

    const deltaCall = mockTo.mock.calls.find((call) => call[0] !== el)
    expect(deltaCall[0]).toMatchObject({ x: dx, y: dy, sx, sy })
    expect(deltaCall[1]).toMatchObject({ x: 0, y: 0, sx: 1, sy: 1, duration: 0.05 })

    const leftBeforeUpdate = el.style.left
    deltaCall[0].x = 0
    deltaCall[0].y = 0
    deltaCall[0].sx = 1
    deltaCall[0].sy = 1
    deltaCall[1].onUpdate()
    expect(el.style.transform).toBe('translate(0px, 0px) scale(1, 1)') // onUpdate paints only `transform`.
    expect(el.style.left).toBe(leftBeforeUpdate)
  })

  test('a zero-width or zero-height target falls back to a scale of 1 rather than dividing by zero', () => {
    const el = makeEl()
    moveReaderCursor(el, BOX_A)
    moveReaderCursor(el, { left: 0, top: 0, width: 0, height: 0 })

    const deltaCall = mockTo.mock.calls.find((call) => call[0] !== el)
    expect(deltaCall[0].sx).toBe(1)
    expect(deltaCall[0].sy).toBe(1)
  })

  test('an interrupted move kills the prior tween via the stored handle', () => {
    const el = makeEl()
    moveReaderCursor(el, BOX_A)
    moveReaderCursor(el, BOX_B)

    const firstDeltaCall = mockTo.mock.calls.find((call) => call[0] !== el)
    const firstDeltaTween = mockTo.mock.results[mockTo.mock.calls.indexOf(firstDeltaCall)].value

    moveReaderCursor(el, BOX_A)

    expect(firstDeltaTween.kill).toHaveBeenCalledTimes(1)
  })
})

describe('hideReaderCursor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('kills the tracked tween before fading the element out', () => {
    const el = makeEl()
    moveReaderCursor(el, BOX_A)
    moveReaderCursor(el, BOX_B)
    const deltaCall = mockTo.mock.calls.find((call) => call[0] !== el)
    const deltaTween = mockTo.mock.results[mockTo.mock.calls.indexOf(deltaCall)].value
    mockTo.mockClear()

    hideReaderCursor(el)

    expect(deltaTween.kill).toHaveBeenCalledTimes(1)
    expect(mockTo).toHaveBeenCalledWith(el, expect.objectContaining({ autoAlpha: 0 }))
  })

  test('does not crash on an element that was never moved', () => {
    const el = makeEl()
    expect(() => hideReaderCursor(el)).not.toThrow()
  })
})
