import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { mockSet, mockTo } = vi.hoisted(() => ({
  mockSet: vi.fn(),
  mockTo: vi.fn((_el, opts) => opts?.onComplete?.())
}))

vi.mock('gsap', () => ({ gsap: { set: mockSet, to: mockTo } }))

import {
  actionsSwingBeforeEnter,
  actionsSwingEnter,
  actionsSwingLeave
} from '@/utils/animations/dashboard-actions'

// ── Helpers ───────────────────────────────────────────────────────────────────

function elWithPanel() {
  const wrapper = document.createElement('div')
  const panel = document.createElement('div')
  wrapper.appendChild(panel)
  return { wrapper, panel }
}

describe('dashboard-actions animations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTo.mockImplementation((_el, opts) => opts?.onComplete?.())
  })

  describe('actionsSwingBeforeEnter', () => {
    test('collapses the wrapper height to 0 and hides overflow', () => {
      const { wrapper } = elWithPanel()
      actionsSwingBeforeEnter(wrapper)
      expect(mockSet).toHaveBeenCalledWith(wrapper, { height: 0, overflow: 'hidden' })
    })

    test('primes the panel rotated back and invisible', () => {
      const { wrapper, panel } = elWithPanel()
      actionsSwingBeforeEnter(wrapper)
      expect(mockSet).toHaveBeenCalledWith(panel, {
        rotateX: -90,
        opacity: 0,
        transformOrigin: 'top center'
      })
    })
  })

  describe('actionsSwingEnter', () => {
    test('tweens the wrapper height to the panel offsetHeight', () => {
      const { wrapper, panel } = elWithPanel()
      Object.defineProperty(panel, 'offsetHeight', { value: 120, configurable: true })
      const done = vi.fn()

      actionsSwingEnter(wrapper, done)

      expect(mockTo).toHaveBeenCalledWith(
        wrapper,
        expect.objectContaining({ height: 120, ease: 'power3.out' })
      )
    })

    test('tweens the panel back to rotateX 0 and opacity 1', () => {
      const { wrapper, panel } = elWithPanel()
      const done = vi.fn()

      actionsSwingEnter(wrapper, done)

      expect(mockTo).toHaveBeenCalledWith(
        panel,
        expect.objectContaining({ rotateX: 0, opacity: 1, ease: 'back.out(1.6)' })
      )
    })

    test('restores wrapper height to auto and calls done once the panel tween completes', () => {
      const { wrapper } = elWithPanel()
      const done = vi.fn()

      actionsSwingEnter(wrapper, done)

      expect(mockSet).toHaveBeenCalledWith(wrapper, { height: 'auto', overflow: '' })
      expect(done).toHaveBeenCalledTimes(1)
    })
  })

  describe('actionsSwingLeave', () => {
    test('pins the wrapper height to its current offsetHeight before collapsing', () => {
      const { wrapper } = elWithPanel()
      Object.defineProperty(wrapper, 'offsetHeight', { value: 80, configurable: true })
      const done = vi.fn()

      actionsSwingLeave(wrapper, done)

      expect(mockSet).toHaveBeenCalledWith(wrapper, { height: 80, overflow: 'hidden' })
    })

    test('tweens the panel rotated away and faded out', () => {
      const { wrapper, panel } = elWithPanel()
      const done = vi.fn()

      actionsSwingLeave(wrapper, done)

      expect(mockTo).toHaveBeenCalledWith(
        panel,
        expect.objectContaining({ rotateX: -90, opacity: 0, ease: 'power2.in' })
      )
    })

    test('collapses the wrapper height to 0 and calls done on complete', () => {
      const { wrapper } = elWithPanel()
      const done = vi.fn()

      actionsSwingLeave(wrapper, done)

      expect(mockTo).toHaveBeenCalledWith(wrapper, expect.objectContaining({ height: 0 }))
      expect(done).toHaveBeenCalledTimes(1)
    })
  })
})
