import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { mockFromTo, mockTo } = vi.hoisted(() => ({
  mockFromTo: vi.fn((_el, _from, to) => to?.onComplete?.()),
  mockTo: vi.fn((_el, opts) => opts?.onComplete?.())
}))

vi.mock('gsap', () => ({ gsap: { fromTo: mockFromTo, to: mockTo } }))

import { popDeckIn, popDeckOut } from '@/utils/animations/deck-grid'

describe('deck-grid animations', () => {
  const el = document.createElement('div')

  beforeEach(() => {
    vi.clearAllMocks()
    mockFromTo.mockImplementation((_el, _from, to) => to?.onComplete?.())
    mockTo.mockImplementation((_el, opts) => opts?.onComplete?.())
  })

  describe('popDeckIn', () => {
    test('animates from scaled-down and invisible', () => {
      const done = vi.fn()
      popDeckIn(el, done)

      expect(mockFromTo).toHaveBeenCalledWith(
        el,
        { scale: 0.5, opacity: 0 },
        expect.objectContaining({ scale: 1, opacity: 1, ease: 'back.out(2)' })
      )
    })

    test('clears inline props and calls done on complete', () => {
      const done = vi.fn()
      popDeckIn(el, done)

      expect(mockFromTo).toHaveBeenCalledWith(
        el,
        expect.anything(),
        expect.objectContaining({ clearProps: 'all' })
      )
      expect(done).toHaveBeenCalledTimes(1)
    })
  })

  describe('popDeckOut', () => {
    test('shrinks and fades the element out', () => {
      const done = vi.fn()
      popDeckOut(el, done)

      expect(mockTo).toHaveBeenCalledWith(
        el,
        expect.objectContaining({ scale: 0.5, opacity: 0, ease: 'power2.in' })
      )
    })

    test('calls done on complete', () => {
      const done = vi.fn()
      popDeckOut(el, done)

      expect(done).toHaveBeenCalledTimes(1)
    })
  })
})
