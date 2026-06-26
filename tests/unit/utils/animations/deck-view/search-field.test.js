import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { mockFromTo, mockTo, mockKillTweensOf } = vi.hoisted(() => ({
  mockFromTo: vi.fn(),
  mockTo: vi.fn(),
  mockKillTweensOf: vi.fn()
}))

vi.mock('gsap', () => ({
  gsap: { fromTo: mockFromTo, to: mockTo, killTweensOf: mockKillTweensOf }
}))

import { expandSearchInput, collapseSearchInput } from '@/utils/animations/deck-view/search-field'

const el = document.createElement('div')

describe('search-field animations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('expandSearchInput', () => {
    test('kills existing tweens on the element first', () => {
      expandSearchInput(el, 200)
      expect(mockKillTweensOf).toHaveBeenCalledWith(el)
    })

    test('tweens width from 0 to the supplied width value', () => {
      expandSearchInput(el, 208)
      const [, from, to] = mockFromTo.mock.calls[0]
      expect(from.width).toBe(0)
      expect(to.width).toBe(208)
    })

    test('tweens opacity from 0 to 1', () => {
      expandSearchInput(el, 208)
      const [, from, to] = mockFromTo.mock.calls[0]
      expect(from.opacity).toBe(0)
      expect(to.opacity).toBe(1)
    })

    test('passes done as the onComplete callback', () => {
      const done = vi.fn()
      expandSearchInput(el, 208, done)
      const [, , to] = mockFromTo.mock.calls[0]
      expect(to.onComplete).toBe(done)
    })

    test('works when done is omitted (no crash)', () => {
      expect(() => expandSearchInput(el, 208)).not.toThrow()
    })

    test('uses a positive duration', () => {
      expandSearchInput(el, 208)
      const [, , to] = mockFromTo.mock.calls[0]
      expect(to.duration).toBeGreaterThan(0)
    })

    test('does not call gsap.to', () => {
      expandSearchInput(el, 208)
      expect(mockTo).not.toHaveBeenCalled()
    })
  })

  describe('collapseSearchInput', () => {
    test('kills existing tweens on the element first', () => {
      collapseSearchInput(el)
      expect(mockKillTweensOf).toHaveBeenCalledWith(el)
    })

    test('tweens width to 0', () => {
      collapseSearchInput(el)
      const [, opts] = mockTo.mock.calls[0]
      expect(opts.width).toBe(0)
    })

    test('tweens opacity to 0', () => {
      collapseSearchInput(el)
      const [, opts] = mockTo.mock.calls[0]
      expect(opts.opacity).toBe(0)
    })

    test('passes done as the onComplete callback', () => {
      const done = vi.fn()
      collapseSearchInput(el, done)
      const [, opts] = mockTo.mock.calls[0]
      expect(opts.onComplete).toBe(done)
    })

    test('works when done is omitted (no crash)', () => {
      expect(() => collapseSearchInput(el)).not.toThrow()
    })

    test('uses a positive duration', () => {
      collapseSearchInput(el)
      const [, opts] = mockTo.mock.calls[0]
      expect(opts.duration).toBeGreaterThan(0)
    })

    test('does not call gsap.fromTo', () => {
      collapseSearchInput(el)
      expect(mockFromTo).not.toHaveBeenCalled()
    })
  })

  test('expand and collapse share the same duration constant', () => {
    expandSearchInput(el, 208)
    collapseSearchInput(el)
    const expandDuration = mockFromTo.mock.calls[0][2].duration
    const collapseDuration = mockTo.mock.calls[0][1].duration
    expect(expandDuration).toBe(collapseDuration)
  })
})
