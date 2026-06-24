import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'

const { mockGsapTo } = vi.hoisted(() => ({ mockGsapTo: vi.fn() }))

vi.mock('gsap', () => ({ gsap: { to: mockGsapTo } }))

// Stub out dynamic imports performed on idle so the real modal modules aren't
// pulled into the jsdom runtime during this unit test.
vi.mock('@/components/study-session/index.vue', () => ({ default: {} }))
vi.mock('@/components/study-session/session-summary/index.vue', () => ({ default: {} }))
vi.mock('@/components/modals/deck-settings/index.vue', () => ({ default: {} }))

import { warmupAnimations } from '@/utils/animations/warmup'

describe('warmupAnimations', () => {
  let rafSpy
  let rafCallbacks
  let idleSpy

  beforeEach(() => {
    mockGsapTo.mockClear()
    rafCallbacks = []
    rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallbacks.push(cb)
      return rafCallbacks.length
    })

    if ('requestIdleCallback' in window) {
      idleSpy = vi.spyOn(window, 'requestIdleCallback').mockImplementation((cb) => {
        cb()
        return 1
      })
    }

    // Remove any leaked warmup elements from prior tests.
    document.querySelectorAll('div[aria-hidden="true"]').forEach((el) => el.remove())
  })

  afterEach(() => {
    rafSpy.mockRestore()
    idleSpy?.mockRestore()
  })

  test('runs gsap priming tweens for the eases used by modal animations', () => {
    warmupAnimations()

    expect(mockGsapTo).toHaveBeenCalledTimes(2)

    const eases = mockGsapTo.mock.calls.map((c) => c[1]?.ease)
    expect(eases).toContain('expo.out')
    expect(eases).toContain('back.out(1.7)')
  })

  test('mounts a hidden backdrop-filter probe element', () => {
    warmupAnimations()

    const probes = [...document.body.querySelectorAll('div[aria-hidden="true"]')]

    expect(probes).toHaveLength(1)
    const probe = probes[0]
    expect(probe.getAttribute('aria-hidden')).toBe('true')
    expect(probe.style.opacity).toBe('0')
  })

  test('removes the probe element after two animation frames', () => {
    warmupAnimations()

    const findProbes = () => [...document.body.querySelectorAll('div[aria-hidden="true"]')]

    expect(findProbes()).toHaveLength(1)

    // Flush the first RAF — probe should still be present.
    rafCallbacks.shift()?.()
    expect(findProbes()).toHaveLength(1)

    // Flush the second RAF — probe is now removed.
    rafCallbacks.shift()?.()
    expect(findProbes()).toHaveLength(0)
  })

  test('schedules a preload pass via requestIdleCallback when available', () => {
    if (!idleSpy) return

    warmupAnimations()

    expect(idleSpy).toHaveBeenCalled()
  })
})
