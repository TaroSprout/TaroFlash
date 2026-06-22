import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { mockCreate, mockRegisterPlugin, mockDelayedCall } = vi.hoisted(() => ({
  // Return a stub ScrollTrigger so the caller can kill() it.
  mockCreate: vi.fn(() => ({ kill: vi.fn() })),
  mockRegisterPlugin: vi.fn(),
  // Run the scheduled callback immediately so staggered reveals are observable.
  mockDelayedCall: vi.fn((_delay, fn) => fn())
}))

vi.mock('gsap', () => ({
  gsap: { registerPlugin: mockRegisterPlugin, delayedCall: mockDelayedCall }
}))
vi.mock('gsap/ScrollTrigger', () => ({ ScrollTrigger: { create: mockCreate } }))

import { createFeatureReveal } from '@/utils/animations/welcome/feature-reveal'

const trigger = document.createElement('ul')

function lastConfig() {
  return mockCreate.mock.calls.at(-1)[0]
}

describe('createFeatureReveal', () => {
  beforeEach(() => {
    mockCreate.mockClear()
    mockDelayedCall.mockClear()
  })

  test('registers the ScrollTrigger plugin on import', () => {
    expect(mockRegisterPlugin).toHaveBeenCalled()
  })

  test('creates a ScrollTrigger spanning the central viewport band', () => {
    createFeatureReveal(trigger, 3, vi.fn())
    const config = lastConfig()
    expect(config.trigger).toBe(trigger)
    expect(config.start).toBe('top 60%')
    expect(config.end).toBe('bottom 25%')
    expect(typeof config.onEnter).toBe('function')
    expect(typeof config.onLeave).toBe('function')
    expect(typeof config.onEnterBack).toBe('function')
    expect(typeof config.onLeaveBack).toBe('function')
  })

  test('returns the created ScrollTrigger so the caller can kill it', () => {
    const handle = createFeatureReveal(trigger, 3, vi.fn())
    expect(handle).toBe(mockCreate.mock.results.at(-1).value)
    expect(handle.kill).toBeTypeOf('function')
  })

  test('onEnter flips every card to "front", once each, in index order', () => {
    const reveal = vi.fn()
    createFeatureReveal(trigger, 3, reveal)

    lastConfig().onEnter()

    expect(reveal.mock.calls).toEqual([
      [0, 'front'],
      [1, 'front'],
      [2, 'front']
    ])
  })

  test('onEnterBack flips every card to "front" when re-entering the band from below', () => {
    const reveal = vi.fn()
    createFeatureReveal(trigger, 3, reveal)

    lastConfig().onEnterBack()

    expect(reveal.mock.calls).toEqual([
      [0, 'front'],
      [1, 'front'],
      [2, 'front']
    ])
  })

  test('onLeave flips every card back to "cover" when leaving the band above', () => {
    const reveal = vi.fn()
    createFeatureReveal(trigger, 3, reveal)

    lastConfig().onLeave()

    expect(reveal.mock.calls).toEqual([
      [0, 'cover'],
      [1, 'cover'],
      [2, 'cover']
    ])
  })

  test('onLeaveBack flips every card back to "cover", once each', () => {
    const reveal = vi.fn()
    createFeatureReveal(trigger, 3, reveal)

    lastConfig().onLeaveBack()

    expect(reveal.mock.calls).toEqual([
      [0, 'cover'],
      [1, 'cover'],
      [2, 'cover']
    ])
  })

  test('staggers each flip on an increasing delay', () => {
    createFeatureReveal(trigger, 3, vi.fn())

    lastConfig().onEnter()

    const delays = mockDelayedCall.mock.calls.map((call) => call[0])
    expect(delays).toHaveLength(3)
    expect(delays[0]).toBe(0)
    expect(delays[1]).toBeGreaterThan(delays[0])
    expect(delays[2]).toBeGreaterThan(delays[1])
  })
})
