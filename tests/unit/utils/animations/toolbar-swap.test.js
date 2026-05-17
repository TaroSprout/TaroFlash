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
    test('tweens from positive y offset + faded to settled y 0', () => {
      const el = document.createElement('div')
      toolbarEnter(el, done)
      expect(mockFromTo).toHaveBeenCalledWith(
        el,
        expect.objectContaining({ opacity: 0, y: expect.any(Number) }),
        expect.objectContaining({ opacity: 1, y: 0 })
      )
      expect(mockFromTo.mock.calls[0][1].y).toBeGreaterThan(0)
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

    test('tweens to faded + negative y offset (slides up out of frame)', () => {
      const el = document.createElement('div')
      toolbarLeave(el, done)
      expect(mockTo).toHaveBeenCalledWith(
        el,
        expect.objectContaining({ opacity: 0, y: expect.any(Number) })
      )
      expect(mockTo.mock.calls[0][1].y).toBeLessThan(0)
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
