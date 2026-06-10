import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('gsap', () => ({ gsap: { from: mockFrom } }))

import { expandListItemIn } from '@/utils/animations/list-item'

const el = document.createElement('div')

describe('expandListItemIn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('calls gsap.from on the provided element [obligation]', () => {
    expandListItemIn(el)
    expect(mockFrom).toHaveBeenCalledWith(el, expect.any(Object))
  })

  test('animates from scaleY=0 and opacity=0 (collapsed top edge grow-in) [obligation]', () => {
    expandListItemIn(el)
    const opts = mockFrom.mock.calls[0][1]
    expect(opts.scaleY).toBe(0)
    expect(opts.opacity).toBe(0)
  })

  test('uses transformOrigin=center top so the grow anchors at the row top edge [obligation]', () => {
    expandListItemIn(el)
    const opts = mockFrom.mock.calls[0][1]
    expect(opts.transformOrigin).toBe('center top')
  })

  test('clears all inline GSAP props on complete (clearProps=all) [obligation]', () => {
    expandListItemIn(el)
    const opts = mockFrom.mock.calls[0][1]
    expect(opts.clearProps).toBe('all')
  })

  test('uses a positive duration', () => {
    expandListItemIn(el)
    const opts = mockFrom.mock.calls[0][1]
    expect(opts.duration).toBeGreaterThan(0)
  })
})
