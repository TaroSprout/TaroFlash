import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { mockFrom, mockTo, mockTimeline, mockTimelineTo } = vi.hoisted(() => {
  const mockTimelineTo = vi.fn().mockReturnThis()
  const mockTimeline = vi.fn(() => ({ to: mockTimelineTo }))
  const mockTo = vi.fn()
  const mockFrom = vi.fn()
  return { mockFrom, mockTo, mockTimeline, mockTimelineTo }
})

vi.mock('gsap', () => ({ gsap: { from: mockFrom, to: mockTo, timeline: mockTimeline } }))

import { expandListItemIn, liftListItem, dropListItem } from '@/utils/animations/list-item'

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

describe('liftListItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('creates a gsap timeline', () => {
    liftListItem(el)
    expect(mockTimeline).toHaveBeenCalledOnce()
  })

  test('animates to scale above 1 on the first tween (overshoot)', () => {
    liftListItem(el)
    const first_opts = mockTimelineTo.mock.calls[0][1]
    expect(first_opts.scale).toBeGreaterThan(1)
  })

  test('settles at a scale above 1 on the second tween (held lift)', () => {
    liftListItem(el)
    const second_opts = mockTimelineTo.mock.calls[1][1]
    expect(second_opts.scale).toBeGreaterThan(1)
  })

  test('first tween overshoot scale exceeds the settled lift scale', () => {
    liftListItem(el)
    const first_scale = mockTimelineTo.mock.calls[0][1].scale
    const second_scale = mockTimelineTo.mock.calls[1][1].scale
    expect(first_scale).toBeGreaterThan(second_scale)
  })

  test('does not use clearProps so the lifted scale persists during the drag', () => {
    liftListItem(el)
    mockTimelineTo.mock.calls.forEach(([, opts]) => {
      expect(opts.clearProps).toBeUndefined()
    })
  })
})

describe('dropListItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('animates to scale=1 (settling back to rest)', () => {
    dropListItem(el)
    const opts = mockTo.mock.calls[0][1]
    expect(opts.scale).toBe(1)
  })

  test('clears the inline scale after settling so no leftover transform remains', () => {
    dropListItem(el)
    const opts = mockTo.mock.calls[0][1]
    expect(opts.clearProps).toBe('scale')
  })

  test('uses a positive duration', () => {
    dropListItem(el)
    const opts = mockTo.mock.calls[0][1]
    expect(opts.duration).toBeGreaterThan(0)
  })
})
