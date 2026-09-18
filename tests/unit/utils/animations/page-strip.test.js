import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { mockTo, mockKillTweensOf } = vi.hoisted(() => ({
  mockTo: vi.fn(),
  mockKillTweensOf: vi.fn()
}))

vi.mock('gsap', () => ({
  gsap: {
    to: mockTo,
    killTweensOf: mockKillTweensOf
  }
}))

import { slideScroller } from '@/utils/animations/page-strip'

function makeScroller(scrollLeft = 0) {
  const el = document.createElement('div')
  Object.defineProperty(el, 'scrollLeft', { value: scrollLeft, writable: true })
  return el
}

describe('slideScroller', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('kills any tween already running on this scroller before starting a new one', () => {
    const el = makeScroller()

    slideScroller(el, 400, vi.fn())

    expect(mockKillTweensOf).toHaveBeenCalledTimes(1)
    const proxy = mockKillTweensOf.mock.calls[0][0]
    expect(proxy).toEqual({ x: 0 })
  })

  test('tweens a proxy object from the scroller current position to the target', () => {
    const el = makeScroller(100)

    slideScroller(el, 400, vi.fn())

    expect(mockTo).toHaveBeenCalledTimes(1)
    const [proxy, config] = mockTo.mock.calls[0]
    expect(proxy).toEqual({ x: 100 })
    expect(config).toMatchObject({ x: 400, duration: 0.2, ease: 'power2.out' })
  })

  test('onUpdate writes the tweened proxy value back onto scrollLeft', () => {
    const el = makeScroller(0)

    slideScroller(el, 400, vi.fn())

    const [proxy, config] = mockTo.mock.calls[0]
    proxy.x = 250
    config.onUpdate()

    expect(el.scrollLeft).toBe(250)
  })

  test('forwards the caller-supplied onComplete to the tween config', () => {
    const el = makeScroller()
    const onComplete = vi.fn()

    slideScroller(el, 400, onComplete)

    const [, config] = mockTo.mock.calls[0]
    expect(config.onComplete).toBe(onComplete)
  })
})
