import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { ref } from 'vue'

// A fake paused timeline captures every to/fromTo; play() fires the driver's
// onComplete so `handle.done` resolves. Mirrors the card-slide / toolbar-swap
// driver-motion test rig.

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

import { routeSlide } from '@/utils/animations/route-slide'

function build({ dashboard = false, initial = false } = {}) {
  const going_to_dashboard = ref(dashboard)
  const is_initial = ref(initial)
  const animation_done = ref(false)
  const slide = routeSlide({ going_to_dashboard, is_initial, animation_done })
  return { ...slide, going_to_dashboard, is_initial, animation_done }
}

const el = () => document.createElement('div')

beforeEach(() => {
  vi.clearAllMocks()
  timelines.length = 0
  mockUseMotionStore.mockReturnValue({ factors: { duration: 1 } })
})

describe('routeSlide — a leave followed by an enter plays the slide', () => {
  test('the leave pins its node out of flow and slides it off', () => {
    const { onLeave } = build()
    const node = el()

    onLeave(node, vi.fn())

    expect(node.style.position).toBe('absolute')
    expect(timelines[0].state.calls.to).toHaveLength(1)
  })

  test('the paired enter runs a fromTo slide', () => {
    const { onLeave, onEnter } = build()

    onLeave(el(), vi.fn())
    onEnter(el(), vi.fn())

    expect(timelines).toHaveLength(2) // one for the leave, one for the played enter
    expect(timelines[1].state.calls.fromTo).toHaveLength(1)
  })

  test('the enter sets animation_done true once the timeline completes', async () => {
    const { onLeave, onEnter, animation_done } = build()

    onLeave(el(), vi.fn())
    onEnter(el(), vi.fn())
    await Promise.resolve()

    expect(animation_done.value).toBe(true)
  })
})

describe('routeSlide — enter with no preceding leave', () => {
  test('skips the animation and calls done immediately', () => {
    const { onEnter } = build()
    const done = vi.fn()

    onEnter(el(), done)

    expect(done).toHaveBeenCalledOnce()
    expect(timelines).toHaveLength(0)
  })

  test('sets animation_done true synchronously when skipping', () => {
    const { onEnter, animation_done } = build()

    onEnter(el(), vi.fn())

    expect(animation_done.value).toBe(true)
  })
})

describe('routeSlide — is_initial', () => {
  test('skips the enter animation on the first paint', () => {
    const { onEnter, animation_done } = build({ initial: true })
    const done = vi.fn()

    onEnter(el(), done)

    expect(done).toHaveBeenCalledOnce()
    expect(timelines).toHaveLength(0)
    expect(animation_done.value).toBe(true)
  })

  test('skips even when a leave happened to fire first', () => {
    const { onLeave, onEnter } = build({ initial: true })

    onLeave(el(), vi.fn())
    const leave_timelines = timelines.length
    onEnter(el(), vi.fn())

    expect(timelines).toHaveLength(leave_timelines) // the enter added no timeline of its own
  })
})

describe('routeSlide — direction', () => {
  test('leave slides off to the right (+100) heading to the dashboard', () => {
    const { onLeave } = build({ dashboard: true })

    onLeave(el(), vi.fn())

    const [, vars] = timelines[0].state.calls.to[0]
    expect(vars).toMatchObject({ xPercent: 100 })
  })

  test('leave slides off to the left (-100) heading away from the dashboard', () => {
    const { onLeave } = build({ dashboard: false })

    onLeave(el(), vi.fn())

    const [, vars] = timelines[0].state.calls.to[0]
    expect(vars).toMatchObject({ xPercent: -100 })
  })

  test('enter slides in from the left (-100) heading to the dashboard', () => {
    const { onLeave, onEnter } = build({ dashboard: true })

    onLeave(el(), vi.fn())
    onEnter(el(), vi.fn())

    const [, from] = timelines[1].state.calls.fromTo[0]
    expect(from).toEqual({ xPercent: -100 })
  })

  test('enter slides in from the right (+100) heading away from the dashboard', () => {
    const { onLeave, onEnter } = build({ dashboard: false })

    onLeave(el(), vi.fn())
    onEnter(el(), vi.fn())

    const [, from] = timelines[1].state.calls.fromTo[0]
    expect(from).toEqual({ xPercent: 100 })
  })
})

describe('routeSlide — per-instance reset', () => {
  test('a second enter with no fresh leave skips', () => {
    const { onLeave, onEnter } = build()

    onLeave(el(), vi.fn())
    onEnter(el(), vi.fn())
    const after_first = timelines.length

    onEnter(el(), vi.fn())

    expect(timelines).toHaveLength(after_first)
  })

  test('an interrupted leave that never paired still lets the next real enter slide', () => {
    const { onLeave, onEnter } = build()

    onLeave(el(), vi.fn()) // first navigation leaves but is interrupted before its enter runs
    onLeave(el(), vi.fn()) // second navigation leaves too, then its enter arrives
    const before_enter = timelines.length
    onEnter(el(), vi.fn())

    expect(timelines.length).toBe(before_enter + 1) // the enter played its own slide rather than being skipped
    expect(timelines.at(-1).state.calls.fromTo).toHaveLength(1)
  })
})
