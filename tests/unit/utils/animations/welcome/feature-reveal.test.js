import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { mockCreate, mockRegisterPlugin, mockDelayedCall, mockScrollTriggerKill } = vi.hoisted(
  () => ({
    mockScrollTriggerKill: vi.fn(),
    mockCreate: vi.fn(() => ({ kill: mockScrollTriggerKill })), // stub ScrollTrigger the caller can kill()
    mockRegisterPlugin: vi.fn(),
    mockDelayedCall: vi.fn((_delay, fn) => {
      const tween = { kill: vi.fn(() => (tween.killed = true)) }
      queueMicrotask(() => {
        if (!tween.killed) fn() // async like real GSAP, so `call` is assigned before its callback runs and kill() can cancel it first
      })
      return tween
    })
  })
)

vi.mock('gsap', () => ({
  gsap: { registerPlugin: mockRegisterPlugin, delayedCall: mockDelayedCall }
}))
vi.mock('gsap/ScrollTrigger', () => ({ ScrollTrigger: { create: mockCreate } }))

const { mockUseMotionStore } = vi.hoisted(() => ({
  mockUseMotionStore: vi.fn(() => ({ factors: { stagger: 1 } }))
}))
vi.mock('@/stores/motion', () => ({ useMotionStore: mockUseMotionStore }))

import { createFeatureReveal } from '@/utils/animations/welcome/feature-reveal'

const trigger = document.createElement('ul')

function lastConfig() {
  return mockCreate.mock.calls.at(-1)[0]
}

function flushMicrotasks() {
  return Promise.resolve()
}

describe('createFeatureReveal', () => {
  beforeEach(() => {
    mockCreate.mockClear()
    mockScrollTriggerKill.mockClear()
    mockDelayedCall.mockClear()
    mockUseMotionStore.mockReturnValue({ factors: { stagger: 1 } })
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
    expect(handle.kill).toBeTypeOf('function')
  })

  // onEnter fires setActive(index, true) for each index in order
  test('onEnter calls setActive(index, true) for each index in array order', async () => {
    const setActive = vi.fn()
    createFeatureReveal(trigger, [0, 1, 2], setActive)

    lastConfig().onEnter()
    await flushMicrotasks()

    expect(setActive.mock.calls).toEqual([
      [0, true],
      [1, true],
      [2, true]
    ])
  })

  // onEnterBack fires active=true when re-entering from below
  test('onEnterBack calls setActive(index, true) for each index', async () => {
    const setActive = vi.fn()
    createFeatureReveal(trigger, [0, 1, 2], setActive)

    lastConfig().onEnterBack()
    await flushMicrotasks()

    expect(setActive.mock.calls).toEqual([
      [0, true],
      [1, true],
      [2, true]
    ])
  })

  // onLeave fires active=false when leaving the band above
  test('onLeave calls setActive(index, false) for each index', async () => {
    const setActive = vi.fn()
    createFeatureReveal(trigger, [0, 1, 2], setActive)

    lastConfig().onLeave()
    await flushMicrotasks()

    expect(setActive.mock.calls).toEqual([
      [0, false],
      [1, false],
      [2, false]
    ])
  })

  // onLeaveBack fires active=false when scrolling back past the top
  test('onLeaveBack calls setActive(index, false) for each index', async () => {
    const setActive = vi.fn()
    createFeatureReveal(trigger, [0, 1, 2], setActive)

    lastConfig().onLeaveBack()
    await flushMicrotasks()

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

  // only the passed indices fire — a subset triggers only those cards
  test('only the passed indices fire, in array order', async () => {
    const setActive = vi.fn()
    // Only indices [1, 3] — a subset of a 4-card row (tablet grid row)
    createFeatureReveal(trigger, [1, 3], setActive)

    lastConfig().onEnter()
    await flushMicrotasks()

    expect(setActive.mock.calls).toEqual([
      [1, true],
      [3, true]
    ])
    expect(setActive).toHaveBeenCalledTimes(2)
  })

  test('scales the stagger delay by the active motion tier factor', () => {
    mockUseMotionStore.mockReturnValue({ factors: { stagger: 0.5 } })
    createFeatureReveal(trigger, [0, 1, 2], vi.fn())

    lastConfig().onEnter()

    const delays = mockDelayedCall.mock.calls.map((call) => call[0])
    expect(delays[1]).toBeCloseTo(0.06) // 0.12 base * 0.5 tier factor
    expect(delays[2]).toBeCloseTo(0.12)
  })

  test('a stagger factor of 0 flips every card at the same delay', () => {
    mockUseMotionStore.mockReturnValue({ factors: { stagger: 0 } })
    createFeatureReveal(trigger, [0, 1, 2], vi.fn())

    lastConfig().onEnter()

    const delays = mockDelayedCall.mock.calls.map((call) => call[0])
    expect(delays).toEqual([0, 0, 0])
  })

  test('kill() cancels pending staggered flips before they fire', async () => {
    const setActive = vi.fn()
    const handle = createFeatureReveal(trigger, [0, 1, 2], setActive)

    lastConfig().onEnter()
    handle.kill()
    await flushMicrotasks()

    expect(setActive).not.toHaveBeenCalled()
  })

  test('kill() kills the underlying ScrollTrigger', () => {
    const handle = createFeatureReveal(trigger, [0, 1, 2], vi.fn())

    handle.kill()

    expect(mockScrollTriggerKill).toHaveBeenCalledOnce()
  })
})
