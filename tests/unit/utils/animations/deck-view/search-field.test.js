import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { flushPromises } from '@vue/test-utils'

const { mockFromTo, mockTo } = vi.hoisted(() => ({
  mockFromTo: vi.fn(),
  mockTo: vi.fn()
}))

vi.mock('gsap', () => ({
  gsap: { fromTo: mockFromTo, to: mockTo }
}))

import { expandSearchInput, collapseSearchInput } from '@/utils/animations/deck-view/search-field'

const el = document.createElement('div')

// Mirrors the shape `useStageHeight`'s `driveWidth` returns.
function makeDriveWidth() {
  let resolveSettled
  const settled = new Promise((resolve) => {
    resolveSettled = resolve
  })
  const driveWidth = vi.fn(() => ({ settled, cancel: vi.fn() }))
  return { driveWidth, resolveSettled }
}

describe('search-field animations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('expandSearchInput', () => {
    test('tweens opacity from 0 to 1, with no width in the gsap tween', () => {
      const { driveWidth } = makeDriveWidth()
      expandSearchInput(el, 208, driveWidth)
      const [, from, to] = mockFromTo.mock.calls[0]
      expect(from).toEqual({ opacity: 0 })
      expect(to.opacity).toBe(1)
      expect(to.width).toBeUndefined()
    })

    test('delegates the width to driveWidth with the target and the shared timing', () => {
      const { driveWidth } = makeDriveWidth()
      expandSearchInput(el, 208, driveWidth)
      expect(driveWidth).toHaveBeenCalledWith(208, { duration: 0.3, ease: 'power3.out' })
    })

    test('fires done once the driven width change settles', async () => {
      const { driveWidth, resolveSettled } = makeDriveWidth()
      const done = vi.fn()
      expandSearchInput(el, 208, driveWidth, done)
      expect(done).not.toHaveBeenCalled()

      resolveSettled()
      await flushPromises()

      expect(done).toHaveBeenCalledOnce()
    })

    test('works when done is omitted (no crash)', () => {
      const { driveWidth } = makeDriveWidth()
      expect(() => expandSearchInput(el, 208, driveWidth)).not.toThrow()
    })

    test('does not call gsap.to', () => {
      const { driveWidth } = makeDriveWidth()
      expandSearchInput(el, 208, driveWidth)
      expect(mockTo).not.toHaveBeenCalled()
    })
  })

  describe('collapseSearchInput', () => {
    test('tweens opacity to 0', () => {
      const { driveWidth } = makeDriveWidth()
      collapseSearchInput(el, driveWidth)
      const [, opts] = mockTo.mock.calls[0]
      expect(opts.opacity).toBe(0)
      expect(opts.width).toBeUndefined()
    })

    test('delegates the width to driveWidth targeting 0 with the shared timing', () => {
      const { driveWidth } = makeDriveWidth()
      collapseSearchInput(el, driveWidth)
      expect(driveWidth).toHaveBeenCalledWith(0, { duration: 0.3, ease: 'power3.out' })
    })

    test('fires done once the driven width change settles', async () => {
      const { driveWidth, resolveSettled } = makeDriveWidth()
      const done = vi.fn()
      collapseSearchInput(el, driveWidth, done)
      expect(done).not.toHaveBeenCalled()

      resolveSettled()
      await flushPromises()

      expect(done).toHaveBeenCalledOnce()
    })

    test('works when done is omitted (no crash)', () => {
      const { driveWidth } = makeDriveWidth()
      expect(() => collapseSearchInput(el, driveWidth)).not.toThrow()
    })

    test('does not call gsap.fromTo', () => {
      const { driveWidth } = makeDriveWidth()
      collapseSearchInput(el, driveWidth)
      expect(mockFromTo).not.toHaveBeenCalled()
    })
  })

  test('expand and collapse share the same duration/ease', () => {
    const expand = makeDriveWidth()
    const collapse = makeDriveWidth()
    expandSearchInput(el, 208, expand.driveWidth)
    collapseSearchInput(el, collapse.driveWidth)
    expect(expand.driveWidth.mock.calls[0][1]).toEqual(collapse.driveWidth.mock.calls[0][1])
  })
})
