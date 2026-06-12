import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { mockSet, mockTo, mockKillTweensOf } = vi.hoisted(() => ({
  mockSet: vi.fn(),
  mockTo: vi.fn(),
  mockKillTweensOf: vi.fn()
}))

vi.mock('gsap', () => ({
  gsap: {
    set: mockSet,
    to: mockTo,
    killTweensOf: mockKillTweensOf
  }
}))

import { moveReaderCursor, hideReaderCursor } from '@/utils/animations/reader-cursor'

function makeEl() {
  return document.createElement('div')
}

describe('moveReaderCursor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('first call drops the highlight with gsap.set (no tween)', () => {
    const el = makeEl()
    moveReaderCursor(el, { left: 10, top: 20, width: 50, height: 15 })

    expect(mockSet).toHaveBeenCalledWith(
      el,
      expect.objectContaining({ top: 20, height: 15, autoAlpha: 1 })
    )
    // No tween on first call
    expect(mockTo).not.toHaveBeenCalled()
  })

  test('first call paints left and width on the element directly', () => {
    const el = makeEl()
    moveReaderCursor(el, { left: 10, top: 20, width: 50, height: 15 })

    expect(el.style.left).toBe('10px')
    expect(el.style.width).toBe('50px')
  })

  test('subsequent call uses gsap.to for position instead of gsap.set', () => {
    const el = makeEl()
    moveReaderCursor(el, { left: 10, top: 20, width: 50, height: 15 })
    mockSet.mockClear()

    moveReaderCursor(el, { left: 30, top: 40, width: 60, height: 18 })

    expect(mockSet).not.toHaveBeenCalled()
    expect(mockTo).toHaveBeenCalledTimes(2)
  })

  test('subsequent call tweens the element position', () => {
    const el = makeEl()
    moveReaderCursor(el, { left: 10, top: 20, width: 50, height: 15 })

    moveReaderCursor(el, { left: 30, top: 40, width: 60, height: 18 })

    const elCall = mockTo.mock.calls.find((c) => c[0] === el)
    expect(elCall).toBeTruthy()
    expect(elCall[1]).toMatchObject({ top: 40, height: 18, autoAlpha: 1 })
  })

  test('subsequent call kills stale edge tweens before starting a new one', () => {
    const el = makeEl()
    moveReaderCursor(el, { left: 10, top: 20, width: 50, height: 15 })

    moveReaderCursor(el, { left: 30, top: 40, width: 60, height: 18 })

    expect(mockKillTweensOf).toHaveBeenCalledTimes(1)
  })

  test('custom duration is forwarded to both tweens', () => {
    const el = makeEl()
    moveReaderCursor(el, { left: 10, top: 20, width: 50, height: 15 })

    moveReaderCursor(el, { left: 30, top: 40, width: 60, height: 18 }, { duration: 0.05 })

    const calls = mockTo.mock.calls
    expect(calls[0][1].duration).toBe(0.05)
    expect(calls[1][1].duration).toBe(0.05)
  })

  test('zero width box results in zero CSS width (no negative widths)', () => {
    const el = makeEl()
    // width=0: left+width === left, so right-left === 0
    moveReaderCursor(el, { left: 10, top: 20, width: 0, height: 15 })

    expect(el.style.width).toBe('0px')
  })
})

describe('hideReaderCursor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('fades the element out via gsap.to', () => {
    const el = makeEl()
    hideReaderCursor(el)

    expect(mockTo).toHaveBeenCalledWith(el, expect.objectContaining({ autoAlpha: 0 }))
  })

  test('kills any pending edge tweens before fading out', () => {
    const el = makeEl()
    // Prime the element so edges exist in the WeakMap
    moveReaderCursor(el, { left: 10, top: 5, width: 40, height: 10 })
    vi.clearAllMocks()

    hideReaderCursor(el)

    expect(mockKillTweensOf).toHaveBeenCalledTimes(1)
    expect(mockTo).toHaveBeenCalledWith(el, expect.objectContaining({ autoAlpha: 0 }))
  })

  test('does not crash when called on an element that was never moved', () => {
    const el = makeEl()
    expect(() => hideReaderCursor(el)).not.toThrow()
  })

  test('removes the element from the WeakMap so the next moveReaderCursor drops fresh', () => {
    const el = makeEl()
    moveReaderCursor(el, { left: 10, top: 5, width: 40, height: 10 })
    mockSet.mockClear()

    hideReaderCursor(el)
    vi.clearAllMocks()

    // After hide, the next move should behave like a first call (gsap.set, no gsap.to for el)
    moveReaderCursor(el, { left: 20, top: 10, width: 50, height: 12 })

    expect(mockSet).toHaveBeenCalled()
    expect(mockTo).not.toHaveBeenCalled()
  })
})
