import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { makeTimeline, timelines } = vi.hoisted(() => {
  const timelines = []
  function makeTimeline() {
    const state = { onComplete: null, calls: { to: [] }, killed: false }
    const tl = {
      to: (...args) => {
        state.calls.to.push(args)
        return tl
      },
      eventCallback: (_name, cb) => {
        state.onComplete = cb
        return tl
      },
      play: () => tl,
      progress: (value) => {
        if (value === 1 && state.onComplete) state.onComplete()
        return tl
      },
      kill: () => {
        state.killed = true
        return tl
      },
      state
    }
    timelines.push(tl)
    return tl
  }
  return { makeTimeline, timelines }
})

vi.mock('gsap', () => ({
  gsap: {
    timeline: () => makeTimeline(),
    isTweening: () => false,
    set: vi.fn()
  }
}))

const { mockUseMotionStore } = vi.hoisted(() => ({
  mockUseMotionStore: vi.fn(() => ({
    factors: { duration: 1 },
    prefers_reduced_motion: false,
    tier: 'full'
  }))
}))
vi.mock('@/stores/motion', () => ({ useMotionStore: mockUseMotionStore }))

import { shake } from '@/utils/animations/shake'

function el() {
  return document.createElement('div')
}

beforeEach(() => {
  vi.clearAllMocks()
  timelines.length = 0
  mockUseMotionStore.mockReturnValue({
    factors: { duration: 1 },
    prefers_reduced_motion: false,
    tier: 'full'
  })
})

describe('shake — full motion', () => {
  test('rattles the element side to side then back to rest', () => {
    const element = el()
    shake(element)
    const xs = timelines[0].state.calls.to.map(([, opts]) => opts.x)

    expect(timelines[0].state.calls.to).toHaveLength(4)
    expect(xs).toEqual([-6, 6, -6, 0])
    for (const [target] of timelines[0].state.calls.to) expect(target).toBe(element)
  })

  test('resolves once the driver timeline completes', async () => {
    const promise = shake(el())
    timelines[0].progress(1)
    await expect(promise).resolves.toBeUndefined()
  })
})

describe('shake — reduced motion / minimal tier', () => {
  test('resolves immediately without building a timeline under reduced motion', async () => {
    mockUseMotionStore.mockReturnValue({
      factors: { duration: 1 },
      prefers_reduced_motion: true,
      tier: 'full'
    })

    await expect(shake(el())).resolves.toBeUndefined()
    expect(timelines).toHaveLength(0)
  })

  test('resolves immediately without building a timeline on the minimal tier', async () => {
    mockUseMotionStore.mockReturnValue({
      factors: { duration: 1 },
      prefers_reduced_motion: false,
      tier: 'minimal'
    })

    await expect(shake(el())).resolves.toBeUndefined()
    expect(timelines).toHaveLength(0)
  })
})
