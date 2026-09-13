import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { ref } from 'vue'

// ── Hoisted GSAP + motion-store mocks ──────────────────────────────────────────

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

// ── Helpers ─────────────────────────────────────────────────────────────────────

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

beforeEach(() => {
  vi.clearAllMocks()
  timelines.length = 0
  mockUseMotionStore.mockReturnValue({ factors: { duration: 1 } })
})

// ── tabSlideEnter ─────────────────────────────────────────────────────────────

describe('tabSlideEnter — forward', () => {
  test('slides in on the x-axis while fading up', () => {
    tabSlideEnter(ref('forward'), noWrapper())(makeEl())

    const [, from, to] = timelines[0].state.calls.fromTo[0]
    expect(from.x).toBeGreaterThan(0)
    expect(from.opacity).toBe(0)
    expect(to).toMatchObject({ x: 0, opacity: 1 })
  })
})

describe('tabSlideEnter — back', () => {
  test('fades in without any x slide', () => {
    tabSlideEnter(ref('back'), noWrapper())(makeEl())

    const [, from, to] = timelines[0].state.calls.fromTo[0]
    expect(from).toEqual({ opacity: 0 })
    expect(to).toMatchObject({ opacity: 1 })
    expect(from.x).toBeUndefined()
  })
})

// ── tabSlideLeave ─────────────────────────────────────────────────────────────

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

// ── wrapper height ────────────────────────────────────────────────────────────

describe('tab-slide — wrapper height', () => {
  test('freezes the wrapper to its current offsetHeight on leave', () => {
    const wrapper = makeWrapper(350)

    tabSlideLeave(ref('forward'), ref(wrapper))(makeEl())

    expect(wrapper.style.height).toBe('350px')
  })

  test('animates the wrapper to the entering page scrollHeight then clears it', () => {
    const wrapper = makeWrapper(400)
    wrapper.style.height = '400px'

    tabSlideEnter(ref('forward'), ref(wrapper))(makeEl(220))

    const wrapperCall = timelines[0].state.calls.to.find(([target]) => target === wrapper)
    expect(wrapperCall).toBeTruthy()
    expect(wrapperCall[1]).toMatchObject({ height: 220 })

    wrapperCall[1].onComplete()
    expect(wrapper.style.height).toBe('')
  })
})
