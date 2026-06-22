import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const { mockCreate, mockRegisterPlugin } = vi.hoisted(() => ({
  mockCreate: vi.fn(() => ({ kill: vi.fn() })),
  mockRegisterPlugin: vi.fn()
}))

vi.mock('gsap', () => ({
  gsap: { registerPlugin: mockRegisterPlugin }
}))
vi.mock('gsap/ScrollTrigger', () => ({ ScrollTrigger: { create: mockCreate } }))

import { createStackReveal } from '@/utils/animations/welcome/stack-reveal'

const trigger = document.createElement('ul')

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('createStackReveal', () => {
  beforeEach(() => {
    mockCreate.mockClear()
    mockCreate.mockImplementation(() => ({ kill: vi.fn() }))
  })

  test('registers the ScrollTrigger plugin on import', () => {
    expect(mockRegisterPlugin).toHaveBeenCalled()
  })

  // [obligation] creates `count` ScrollTriggers spread across the zone
  test('creates exactly `count` ScrollTriggers [obligation]', () => {
    createStackReveal(trigger, 5, vi.fn())
    expect(mockCreate).toHaveBeenCalledTimes(5)
  })

  // [obligation] position formula: ZONE_BOTTOM + (ZONE_TOP - ZONE_BOTTOM) * i / (count - 1)
  // ZONE_BOTTOM=70, ZONE_TOP=-15 → span = -85, so positions are evenly spaced
  test('first trigger starts at ZONE_BOTTOM (top 70%) [obligation]', () => {
    createStackReveal(trigger, 3, vi.fn())
    const firstStart = mockCreate.mock.calls[0][0].start
    expect(firstStart).toBe('top 70%')
  })

  test('last trigger starts at ZONE_TOP (top -15%) [obligation]', () => {
    createStackReveal(trigger, 3, vi.fn())
    const lastStart = mockCreate.mock.calls[2][0].start
    expect(lastStart).toBe('top -15%')
  })

  test('middle trigger position is evenly interpolated between ZONE_BOTTOM and ZONE_TOP [obligation]', () => {
    // count=3: positions are 70, 27.5, -15. Middle = 70 + ((-15 - 70) * 1 / 2) = 27.5
    createStackReveal(trigger, 3, vi.fn())
    const midStart = mockCreate.mock.calls[1][0].start
    expect(midStart).toBe('top 27.5%')
  })

  test('positions are in strictly descending order (top→bottom scroll advances index) [obligation]', () => {
    createStackReveal(trigger, 5, vi.fn())
    const positions = mockCreate.mock.calls.map((call) =>
      parseFloat(call[0].start.replace('top ', '').replace('%', ''))
    )
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeLessThan(positions[i - 1])
    }
  })

  // [obligation] onEnter fires setActive(i, true)
  test('onEnter calls setActive(index, true) for the correct trigger index [obligation]', () => {
    const setActive = vi.fn()
    createStackReveal(trigger, 3, setActive)

    mockCreate.mock.calls[1][0].onEnter()

    expect(setActive).toHaveBeenCalledWith(1, true)
    expect(setActive).toHaveBeenCalledTimes(1)
  })

  // [obligation] onLeaveBack fires setActive(i, false)
  test('onLeaveBack calls setActive(index, false) for the correct trigger index [obligation]', () => {
    const setActive = vi.fn()
    createStackReveal(trigger, 3, setActive)

    mockCreate.mock.calls[2][0].onLeaveBack()

    expect(setActive).toHaveBeenCalledWith(2, false)
    expect(setActive).toHaveBeenCalledTimes(1)
  })

  test('onEnter fires independently for each trigger with its own index', () => {
    const setActive = vi.fn()
    createStackReveal(trigger, 4, setActive)

    mockCreate.mock.calls[0][0].onEnter()
    mockCreate.mock.calls[3][0].onEnter()

    expect(setActive.mock.calls).toEqual([
      [0, true],
      [3, true]
    ])
  })

  // [obligation] each trigger uses the shared element as its trigger
  test('all ScrollTriggers share the same trigger element [obligation]', () => {
    createStackReveal(trigger, 3, vi.fn())
    for (const [config] of mockCreate.mock.calls) {
      expect(config.trigger).toBe(trigger)
    }
  })

  // [obligation] no markers in non-dev (overlay was removed)
  test('no ScrollTrigger has markers enabled [obligation]', () => {
    createStackReveal(trigger, 3, vi.fn())
    for (const [config] of mockCreate.mock.calls) {
      expect(config.markers).toBeUndefined()
    }
  })

  // [obligation] teardown kills every created trigger
  test('calling the teardown kills all created triggers [obligation]', () => {
    const kills = []
    mockCreate.mockImplementation(() => {
      const kill = vi.fn()
      kills.push(kill)
      return { kill }
    })

    const teardown = createStackReveal(trigger, 4, vi.fn())
    teardown()

    expect(kills).toHaveLength(4)
    for (const kill of kills) {
      expect(kill).toHaveBeenCalledTimes(1)
    }
  })

  test('teardown is a function returned by createStackReveal [obligation]', () => {
    const teardown = createStackReveal(trigger, 3, vi.fn())
    expect(typeof teardown).toBe('function')
  })
})
