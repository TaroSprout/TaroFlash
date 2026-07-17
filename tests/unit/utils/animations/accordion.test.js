import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { mockSet, mockTo } = vi.hoisted(() => ({
  mockSet: vi.fn(),
  mockTo: vi.fn()
}))

vi.mock('gsap', () => ({ gsap: { set: mockSet, to: mockTo } }))

import { accordionEnter, accordionLeave } from '@/utils/animations/accordion'

function makePanel(scrollHeight = 250) {
  const el = document.createElement('div')
  Object.defineProperty(el, 'scrollHeight', { value: scrollHeight, configurable: true })
  return el
}

describe('accordionEnter', () => {
  beforeEach(() => vi.clearAllMocks())

  test('sets the panel to a collapsed, hidden-overflow, zero-opacity starting state', () => {
    const el = makePanel()
    accordionEnter(el, vi.fn())

    expect(mockSet).toHaveBeenCalledWith(el, { height: 0, opacity: 0, overflow: 'hidden' })
  })

  test('tweens height to the panel scrollHeight and opacity to 1', () => {
    const el = makePanel(320)
    accordionEnter(el, vi.fn())

    expect(mockTo).toHaveBeenCalledWith(
      el,
      expect.objectContaining({ height: 320, opacity: 1, ease: 'power2.out' })
    )
  })

  test('clears inline height/overflow and calls done from onComplete', () => {
    const el = makePanel()
    el.style.height = '0px'
    el.style.overflow = 'hidden'
    const done = vi.fn()

    accordionEnter(el, done)

    expect(done).not.toHaveBeenCalled()
    const opts = mockTo.mock.calls[0][1]
    opts.onComplete()

    expect(el.style.height).toBe('')
    expect(el.style.overflow).toBe('')
    expect(done).toHaveBeenCalledTimes(1)
  })
})

describe('accordionLeave', () => {
  beforeEach(() => vi.clearAllMocks())

  test('sets the panel to its current scrollHeight with hidden overflow before collapsing', () => {
    const el = makePanel(180)
    accordionLeave(el, vi.fn())

    expect(mockSet).toHaveBeenCalledWith(el, { height: 180, overflow: 'hidden' })
  })

  test('tweens height and opacity to 0', () => {
    const el = makePanel()
    accordionLeave(el, vi.fn())

    expect(mockTo).toHaveBeenCalledWith(
      el,
      expect.objectContaining({ height: 0, opacity: 0, ease: 'power2.in' })
    )
  })

  test('calls done directly from gsap.to onComplete', () => {
    const el = makePanel()
    const done = vi.fn()

    accordionLeave(el, done)

    expect(done).not.toHaveBeenCalled()
    const opts = mockTo.mock.calls[0][1]
    expect(opts.onComplete).toBe(done)
  })
})
