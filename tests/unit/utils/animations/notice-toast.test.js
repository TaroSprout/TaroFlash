import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { mockSet, mockTo } = vi.hoisted(() => ({
  mockSet: vi.fn(),
  mockTo: vi.fn()
}))

vi.mock('gsap', () => ({ gsap: { set: mockSet, to: mockTo } }))

import { noticeToastListLeave } from '@/utils/animations/notice-toast'

describe('noticeToastListLeave', () => {
  beforeEach(() => vi.clearAllMocks())

  test('freezes the leaving toast at its current on-screen box before the tween', () => {
    const el = document.createElement('div')
    Object.defineProperty(el, 'offsetTop', { value: 40, configurable: true })
    Object.defineProperty(el, 'offsetLeft', { value: 12, configurable: true })
    Object.defineProperty(el, 'offsetWidth', { value: 320, configurable: true })
    Object.defineProperty(el, 'offsetHeight', { value: 64, configurable: true })

    noticeToastListLeave(el, vi.fn())

    expect(mockSet).toHaveBeenCalledWith(el, {
      position: 'absolute',
      top: 40,
      left: 12,
      width: 320,
      height: 64
    })
  })

  test('freezing happens before the scale-fade-out tween is issued', () => {
    const el = document.createElement('div')
    noticeToastListLeave(el, vi.fn())

    const setOrder = mockSet.mock.invocationCallOrder[0]
    const toOrder = mockTo.mock.invocationCallOrder[0]
    expect(setOrder).toBeLessThan(toOrder)
  })

  test('plays the shared scale-fade-out and forwards done via onComplete', () => {
    const el = document.createElement('div')
    const done = vi.fn()
    noticeToastListLeave(el, done)

    expect(mockTo).toHaveBeenCalledWith(
      el,
      expect.objectContaining({ scale: 0.8, opacity: 0, onComplete: done })
    )
  })
})
