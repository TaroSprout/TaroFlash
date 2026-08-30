import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { mockTo, mockTimeline } = vi.hoisted(() => {
  const mockTimeline = vi.fn((opts) => {
    const tl = {}
    tl.to = vi.fn(() => tl)
    queueMicrotask(() => opts?.onComplete?.())
    return tl
  })
  return { mockTo: vi.fn(), mockTimeline }
})

vi.mock('gsap', () => ({
  gsap: {
    to: mockTo,
    timeline: mockTimeline
  }
}))

import { shake } from '@/utils/animations/shake'

const el = document.createElement('div')

describe('shake', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('builds a timeline with an onComplete callback', () => {
    shake(el)
    expect(mockTimeline).toHaveBeenCalledWith(
      expect.objectContaining({ onComplete: expect.any(Function) })
    )
  })

  test('rattles the element side to side then back to rest', () => {
    shake(el)
    const tl = mockTimeline.mock.results[0].value
    const xs = tl.to.mock.calls.map(([, opts]) => opts.x)

    expect(tl.to).toHaveBeenCalledTimes(4)
    expect(xs).toEqual([-6, 6, -6, 0])
    for (const [target] of tl.to.mock.calls) expect(target).toBe(el)
  })

  test('resolves once the timeline completes', async () => {
    await expect(shake(el)).resolves.toBeUndefined()
  })
})
