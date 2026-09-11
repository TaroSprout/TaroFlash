import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { makeTimeline, timelines, mockSet } = vi.hoisted(() => {
  const timelines = []
  function makeTimeline() {
    const state = { onComplete: null, calls: { to: [], fromTo: [] } }
    const tl = {
      to: (...args) => {
        state.calls.to.push(args)
        return tl
      },
      fromTo: (...args) => {
        state.calls.fromTo.push(args)
        return tl
      },
      call: () => tl,
      eventCallback: (_name, cb) => {
        state.onComplete = cb
        return tl
      },
      play: () => {
        state.onComplete?.()
        return tl
      },
      progress: () => tl,
      kill: () => tl,
      state
    }
    timelines.push(tl)
    return tl
  }
  const mockSet = vi.fn((target, vars) => {
    for (const [key, value] of Object.entries(vars)) {
      target.style[key] = typeof value === 'number' ? `${value}px` : value
    }
  })
  return { makeTimeline, timelines, mockSet }
})

vi.mock('gsap', () => ({
  gsap: { timeline: () => makeTimeline(), isTweening: vi.fn(() => false), set: mockSet }
}))

const { mockUseMotionStore } = vi.hoisted(() => ({
  mockUseMotionStore: vi.fn(() => ({ factors: { duration: 1 } }))
}))
vi.mock('@/stores/motion', () => ({ useMotionStore: mockUseMotionStore }))

import { cardSlideEnter, cardSlideLeave } from '@/utils/animations/card-slide'

describe('cardSlideEnter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    timelines.length = 0
    mockUseMotionStore.mockReturnValue({ factors: { duration: 1 } })
  })

  test('forward direction primes from xPercent 100 and settles at 0', () => {
    cardSlideEnter('forward')(document.createElement('div'))

    const [, from, to] = timelines[0].state.calls.fromTo[0]
    expect(from).toEqual({ xPercent: 100 })
    expect(to).toMatchObject({ xPercent: 0 })
  })

  test('back direction primes from xPercent -100 and settles at 0', () => {
    cardSlideEnter('back')(document.createElement('div'))

    const [, from, to] = timelines[0].state.calls.fromTo[0]
    expect(from).toEqual({ xPercent: -100 })
    expect(to).toMatchObject({ xPercent: 0 })
  })

  test('resolves done once the timeline completes', async () => {
    const handle = cardSlideEnter('forward')(document.createElement('div'))
    let resolved = false
    void handle.done.then(() => {
      resolved = true
    })
    expect(resolved).toBe(false)

    timelines[0].progress(1)
    timelines[0].state.onComplete()
    await handle.done

    expect(resolved).toBe(true)
  })
})

describe('cardSlideLeave', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    timelines.length = 0
    mockUseMotionStore.mockReturnValue({ factors: { duration: 1 } })
  })

  test('pins the leaving node out of flow before the tween runs', () => {
    const el = document.createElement('div')
    cardSlideLeave('forward')(el)

    expect(el.style.position).toBe('absolute')
    const [, vars] = timelines[0].state.calls.to[0]
    expect(vars).toMatchObject({ xPercent: -100 })
  })

  test('back direction tweens to xPercent 100', () => {
    const el = document.createElement('div')
    cardSlideLeave('back')(el)

    const [, vars] = timelines[0].state.calls.to[0]
    expect(vars).toMatchObject({ xPercent: 100 })
  })

  test('resolves done once the timeline completes', async () => {
    const handle = cardSlideLeave('forward')(document.createElement('div'))
    let resolved = false
    void handle.done.then(() => {
      resolved = true
    })
    expect(resolved).toBe(false)

    timelines[0].state.onComplete()
    await handle.done

    expect(resolved).toBe(true)
  })
})
