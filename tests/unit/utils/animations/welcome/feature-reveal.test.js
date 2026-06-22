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
    createFeatureReveal(trigger, [0, 1, 2], vi.fn())
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
    const handle = createFeatureReveal(trigger, [0, 1, 2], vi.fn())
    expect(handle).toBe(mockCreate.mock.results.at(-1).value)
    expect(handle.kill).toBeTypeOf('function')
  })

  // [obligation] onEnter fires setActive(index, true) for each index in order
  test('onEnter calls setActive(index, true) for each index in array order [obligation]', () => {
    const setActive = vi.fn()
    createFeatureReveal(trigger, [0, 1, 2], setActive)

    lastConfig().onEnter()

    expect(setActive.mock.calls).toEqual([
      [0, true],
      [1, true],
      [2, true]
    ])
  })

  // [obligation] onEnterBack fires active=true when re-entering from below
  test('onEnterBack calls setActive(index, true) for each index [obligation]', () => {
    const setActive = vi.fn()
    createFeatureReveal(trigger, [0, 1, 2], setActive)

    lastConfig().onEnterBack()

    expect(setActive.mock.calls).toEqual([
      [0, true],
      [1, true],
      [2, true]
    ])
  })

  // [obligation] onLeave fires active=false when leaving the band above
  test('onLeave calls setActive(index, false) for each index [obligation]', () => {
    const setActive = vi.fn()
    createFeatureReveal(trigger, [0, 1, 2], setActive)

    lastConfig().onLeave()

    expect(setActive.mock.calls).toEqual([
      [0, false],
      [1, false],
      [2, false]
    ])
  })

  // [obligation] onLeaveBack fires active=false when scrolling back past the top
  test('onLeaveBack calls setActive(index, false) for each index [obligation]', () => {
    const setActive = vi.fn()
    createFeatureReveal(trigger, [0, 1, 2], setActive)

    lastConfig().onLeaveBack()

    expect(setActive.mock.calls).toEqual([
      [0, false],
      [1, false],
      [2, false]
    ])
  })

  test('staggers each callback on an increasing delay', () => {
    createFeatureReveal(trigger, [0, 1, 2], vi.fn())

    lastConfig().onEnter()

    const delays = mockDelayedCall.mock.calls.map((call) => call[0])
    expect(delays).toHaveLength(3)
    expect(delays[0]).toBe(0)
    expect(delays[1]).toBeGreaterThan(delays[0])
    expect(delays[2]).toBeGreaterThan(delays[1])
  })

  // [obligation] only the passed indices fire — a subset triggers only those cards
  test('only the passed indices fire, in array order [obligation]', () => {
    const setActive = vi.fn()
    // Only indices [1, 3] — a subset of a 4-card row (tablet grid row)
    createFeatureReveal(trigger, [1, 3], setActive)

    lastConfig().onEnter()

    expect(setActive.mock.calls).toEqual([
      [1, true],
      [3, true]
    ])
    expect(setActive).toHaveBeenCalledTimes(2)
  })
})
