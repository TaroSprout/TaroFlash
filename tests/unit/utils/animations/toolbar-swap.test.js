import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { mockFromTo, mockTo } = vi.hoisted(() => ({
  mockFromTo: vi.fn(),
  mockTo: vi.fn()
}))

vi.mock('gsap', () => ({ gsap: { fromTo: mockFromTo, to: mockTo } }))

import { toolbarEnter, toolbarLeave } from '@/utils/animations/toolbar-swap'

const done = vi.fn()

describe('toolbar-swap animations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('toolbarEnter', () => {
    test('tweens opacity from 0 to 1, with no y/transform movement', () => {
      const el = document.createElement('div')
      toolbarEnter(el, done)
      expect(mockFromTo).toHaveBeenCalledWith(
        el,
        { opacity: 0 },
        expect.objectContaining({ opacity: 1 })
      )
      expect(mockFromTo.mock.calls[0][1]).not.toHaveProperty('y')
      expect(mockFromTo.mock.calls[0][2]).not.toHaveProperty('y')
    })

    test('clears only the opacity inline style, not transform', () => {
      const el = document.createElement('div')
      toolbarEnter(el, done)
      expect(mockFromTo.mock.calls[0][2].clearProps).toBe('opacity')
    })

    test('forwards done via onComplete', () => {
      const el = document.createElement('div')
      toolbarEnter(el, done)
      expect(mockFromTo.mock.calls[0][2].onComplete).toBe(done)
    })
  })

  describe('toolbarLeave', () => {
    test('pins the node absolute mid-leave to prevent layout jump', () => {
      const el = document.createElement('div')
      toolbarLeave(el, done)
      expect(el.style.position).toBe('absolute')
      expect(el.style.inset).toBe('0')
    })

    test('tweens opacity to 0, with no y/transform movement', () => {
      const el = document.createElement('div')
      toolbarLeave(el, done)
      expect(mockTo).toHaveBeenCalledWith(el, expect.objectContaining({ opacity: 0 }))
      expect(mockTo.mock.calls[0][1]).not.toHaveProperty('y')
    })

    test('forwards done via onComplete', () => {
      const el = document.createElement('div')
      toolbarLeave(el, done)
      expect(mockTo.mock.calls[0][1].onComplete).toBe(done)
    })

    test('does not call fromTo', () => {
      const el = document.createElement('div')
      toolbarLeave(el, done)
      expect(mockFromTo).not.toHaveBeenCalled()
    })
  })

  test('both use a positive duration', () => {
    const el = document.createElement('div')
    toolbarEnter(el, done)
    toolbarLeave(el, done)
    expect(mockFromTo.mock.calls[0][2].duration).toBeGreaterThan(0)
    expect(mockTo.mock.calls[0][1].duration).toBeGreaterThan(0)
  })
})
