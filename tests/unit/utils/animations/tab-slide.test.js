import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { ref } from 'vue'
import { flushPromises } from '@vue/test-utils'

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

import { tabSlideEnter, tabSlideLeave } from '@/utils/animations/tab-slide'

function makeEl(scrollHeight = 200) {
  const el = document.createElement('div')
  Object.defineProperty(el, 'scrollHeight', { value: scrollHeight, configurable: true })
  return el
}

function makeWrapper(offsetHeight = 400) {
  const el = document.createElement('div')
  Object.defineProperty(el, 'offsetHeight', { value: offsetHeight, configurable: true })
  return el
}

const noWrapper = () => ref(undefined)

function makeDriveHeight() {
  let resolveSettled
  const settled = new Promise((resolve) => {
    resolveSettled = resolve
  })
  const driveHeight = vi.fn(() => ({ settled, cancel: vi.fn() }))
  return { driveHeight, resolveSettled }
}

beforeEach(() => {
  vi.clearAllMocks()
  timelines.length = 0
  mockUseMotionStore.mockReturnValue({ factors: { duration: 1 } })
})

describe('tabSlideEnter — forward', () => {
  test('slides in on the x-axis while fading up', () => {
    const { driveHeight } = makeDriveHeight()
    tabSlideEnter(ref('forward'), noWrapper(), driveHeight)(makeEl())

    const [, from, to] = timelines[0].state.calls.fromTo[0]
    expect(from.x).toBeGreaterThan(0)
    expect(from.opacity).toBe(0)
    expect(to).toMatchObject({ x: 0, opacity: 1 })
  })
})

describe('tabSlideEnter — back', () => {
  test('fades in without any x slide', () => {
    const { driveHeight } = makeDriveHeight()
    tabSlideEnter(ref('back'), noWrapper(), driveHeight)(makeEl())

    const [, from, to] = timelines[0].state.calls.fromTo[0]
    expect(from).toEqual({ opacity: 0 })
    expect(to).toMatchObject({ opacity: 1 })
    expect(from.x).toBeUndefined()
  })
})

describe('tabSlideLeave — forward', () => {
  test('fades out with no x slide', () => {
    tabSlideLeave(ref('forward'), noWrapper())(makeEl())

    const [, vars] = timelines[0].state.calls.to[0]
    expect(vars.opacity).toBe(0)
    expect(vars.x).toBeUndefined()
  })
})

describe('tabSlideLeave — back', () => {
  test('slides to the right while fading out', () => {
    tabSlideLeave(ref('back'), noWrapper())(makeEl())

    const [, vars] = timelines[0].state.calls.to[0]
    expect(vars.x).toBeGreaterThan(0)
    expect(vars.opacity).toBe(0)
  })
})

describe('tab-slide — wrapper height', () => {
  test('freezes the wrapper to its current offsetHeight on leave', () => {
    const wrapper = makeWrapper(350)

    tabSlideLeave(ref('forward'), ref(wrapper))(makeEl())

    expect(wrapper.style.height).toBe('350px')
  })

  test('drives the wrapper height via the injected driveHeight with the entering scrollHeight and resolved timing', () => {
    const wrapper = makeWrapper(400)
    wrapper.style.height = '400px'
    const { driveHeight } = makeDriveHeight()

    tabSlideEnter(ref('forward'), ref(wrapper), driveHeight)(makeEl(220))

    expect(driveHeight).toHaveBeenCalledWith(220, { duration: 0.2, ease: 'power2.out' })
  })

  test('clears the wrapper inline height once the driven change settles', async () => {
    const wrapper = makeWrapper(400)
    wrapper.style.height = '400px'
    const { driveHeight, resolveSettled } = makeDriveHeight()

    tabSlideEnter(ref('forward'), ref(wrapper), driveHeight)(makeEl(220))
    expect(wrapper.style.height).toBe('400px')

    resolveSettled()
    await flushPromises()

    expect(wrapper.style.height).toBe('')
  })
})
