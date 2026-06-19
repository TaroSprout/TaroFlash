import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockSet, mockTo } = vi.hoisted(() => ({
  mockSet: vi.fn(),
  mockTo: vi.fn()
}))

vi.mock('gsap', () => ({ gsap: { set: mockSet, to: mockTo } }))

import { carouselReset, carouselSlide } from '@/utils/animations/inbox-carousel'

// ── Helpers ───────────────────────────────────────────────────────────────────

function el() {
  return document.createElement('div')
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

describe('carouselReset', () => {
  test('calls gsap.set with x=0 on the element', () => {
    const div = el()
    carouselReset(div)
    expect(mockSet).toHaveBeenCalledWith(div, { x: 0 })
  })
})

describe('carouselSlide — direction: next', () => {
  test('does NOT call gsap.set before the tween (next starts at x=0)', () => {
    mockTo.mockImplementation((_el, opts) => {
      opts?.onComplete?.()
      return {}
    })
    carouselSlide(el(), 'next', 100)
    // gsap.set must not be called for 'next' direction
    expect(mockSet).not.toHaveBeenCalled()
  })

  test('tweens x to negative stepPx for next direction', () => {
    mockTo.mockImplementation((_el, opts) => {
      opts?.onComplete?.()
      return {}
    })
    const div = el()
    carouselSlide(div, 'next', 120)
    expect(mockTo).toHaveBeenCalledWith(div, expect.objectContaining({ x: -120 }))
  })

  test('returns a Promise that resolves when onComplete fires', async () => {
    let resolve_fn
    mockTo.mockImplementation((_el, opts) => {
      resolve_fn = opts.onComplete
      return {}
    })
    const promise = carouselSlide(el(), 'next', 100)
    expect(resolve_fn).toBeDefined()
    resolve_fn()
    await expect(promise).resolves.toBeUndefined()
  })
})

describe('carouselSlide — direction: prev', () => {
  test('calls gsap.set to position x=-stepPx before the tween for prev', () => {
    mockTo.mockImplementation((_el, opts) => {
      opts?.onComplete?.()
      return {}
    })
    const div = el()
    carouselSlide(div, 'prev', 100)
    expect(mockSet).toHaveBeenCalledWith(div, { x: -100 })
  })

  test('tweens x to 0 for prev direction', () => {
    mockTo.mockImplementation((_el, opts) => {
      opts?.onComplete?.()
      return {}
    })
    const div = el()
    carouselSlide(div, 'prev', 100)
    expect(mockTo).toHaveBeenCalledWith(div, expect.objectContaining({ x: 0 }))
  })

  test('returns a Promise that resolves when onComplete fires', async () => {
    let resolve_fn
    mockTo.mockImplementation((_el, opts) => {
      resolve_fn = opts.onComplete
      return {}
    })
    const promise = carouselSlide(el(), 'prev', 100)
    resolve_fn()
    await expect(promise).resolves.toBeUndefined()
  })
})
