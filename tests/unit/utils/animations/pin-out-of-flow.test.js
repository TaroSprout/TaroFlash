import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { mockSet } = vi.hoisted(() => ({
  mockSet: vi.fn((target, vars) => {
    for (const [key, value] of Object.entries(vars)) {
      target.style[key] = typeof value === 'number' ? `${value}px` : value
    }
  })
}))

vi.mock('gsap', () => ({ gsap: { set: mockSet } }))

import { pinOutOfFlow } from '@/utils/animations/pin-out-of-flow'

describe('pinOutOfFlow', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('default', () => {
    test('stretches to the parent top-left at full width', () => {
      const el = document.createElement('div')
      pinOutOfFlow(el)

      expect(el.style.position).toBe('absolute')
      expect(el.style.top).toBe('0px')
      expect(el.style.left).toBe('0px')
      expect(el.style.width).toBe('100%')
    })

    test('leaves height unset', () => {
      const el = document.createElement('div')
      pinOutOfFlow(el)

      expect(el.style.height).toBe('')
    })
  })

  describe('lockHeight', () => {
    test('additionally pins the measured height in pixels', () => {
      const el = document.createElement('div')
      Object.defineProperty(el, 'getBoundingClientRect', { value: () => ({ height: 240 }) })

      pinOutOfFlow(el, { lockHeight: true })

      expect(el.style.position).toBe('absolute')
      expect(el.style.top).toBe('0px')
      expect(el.style.left).toBe('0px')
      expect(el.style.width).toBe('100%')
      expect(el.style.height).toBe('240px')
    })
  })

  describe('freeze', () => {
    test('nails the node to its current on-screen box using its captured offsets', () => {
      const el = document.createElement('div')
      Object.defineProperty(el, 'offsetTop', { value: 50, configurable: true })
      Object.defineProperty(el, 'offsetLeft', { value: 30, configurable: true })
      Object.defineProperty(el, 'offsetWidth', { value: 200, configurable: true })
      Object.defineProperty(el, 'offsetHeight', { value: 80, configurable: true })

      pinOutOfFlow(el, { freeze: true })

      expect(el.style.position).toBe('absolute')
      expect(el.style.top).toBe('50px')
      expect(el.style.left).toBe('30px')
      expect(el.style.width).toBe('200px')
      expect(el.style.height).toBe('80px')
    })

    test('ignores lockHeight — freeze already pins its own captured height', () => {
      const el = document.createElement('div')
      Object.defineProperty(el, 'offsetTop', { value: 10, configurable: true })
      Object.defineProperty(el, 'offsetLeft', { value: 10, configurable: true })
      Object.defineProperty(el, 'offsetWidth', { value: 100, configurable: true })
      Object.defineProperty(el, 'offsetHeight', { value: 60, configurable: true })

      pinOutOfFlow(el, { freeze: true, lockHeight: true })

      expect(mockSet).toHaveBeenCalledTimes(1)
      expect(el.style.height).toBe('60px')
    })
  })
})
