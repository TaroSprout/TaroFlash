import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { mockFrom, mockKillTweensOf } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockKillTweensOf: vi.fn()
}))

vi.mock('gsap', () => ({ gsap: { from: mockFrom, killTweensOf: mockKillTweensOf } }))

import { scrollHandleEnter } from '@/utils/animations/scroll-handle'

const el = document.createElement('div')
const done = vi.fn()

/** Answers the reduced-motion query the way a member's system setting would. */
function stubReducedMotion(reduced) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: reduced }))
  )
}

describe('scrollHandleEnter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stubReducedMotion(false)
  })

  test('fades the handle in and grows the thumb out of the bar behind it', () => {
    scrollHandleEnter(el, done)

    expect(mockFrom).toHaveBeenCalledWith(
      el,
      expect.objectContaining({ opacity: 0, '--thumb-overhang': '0px' })
    )
  })

  test('leaves the resting width and opacity to the stylesheet', () => {
    scrollHandleEnter(el, done)

    expect(mockFrom.mock.calls[0][1].clearProps).toBe('all')
  })

  test('uses a positive duration and finishes through done', () => {
    scrollHandleEnter(el, done)

    const opts = mockFrom.mock.calls[0][1]
    expect(opts.duration).toBeGreaterThan(0)
    expect(opts.onComplete).toBe(done)
  })

  // An entrance that restarts before it finished would otherwise have two
  // tweens writing the same overhang at once.
  test('kills any tween still running on the same handle first', () => {
    scrollHandleEnter(el, done)

    expect(mockKillTweensOf).toHaveBeenCalledWith(el)
  })

  test('reduced motion finishes the transition on the spot, with no tween [obligation]', () => {
    stubReducedMotion(true)

    scrollHandleEnter(el, done)

    expect(done).toHaveBeenCalledOnce()
    expect(mockFrom).not.toHaveBeenCalled()
    expect(mockKillTweensOf).not.toHaveBeenCalled()
  })
})
