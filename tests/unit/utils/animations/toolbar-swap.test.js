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

import { toolbarSwap } from '@/utils/animations/toolbar-swap'

describe('toolbarSwap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    timelines.length = 0
    mockUseMotionStore.mockReturnValue({ factors: { duration: 1 } })
  })

  describe('onEnter', () => {
    test('crossfades in from opacity 0 to 1', () => {
      const el = document.createElement('div')
      toolbarSwap.onEnter(el, vi.fn())

      const [, from, to] = timelines[0].state.calls.fromTo[0]
      expect(from).toEqual({ opacity: 0 })
      expect(to).toMatchObject({ opacity: 1 })
    })

    test('resolves done once the timeline completes', async () => {
      const el = document.createElement('div')
      let resolved = false
      const done = () => {
        resolved = true
      }

      toolbarSwap.onEnter(el, done)
      expect(resolved).toBe(false)

      timelines[0].play()
      await Promise.resolve()

      expect(resolved).toBe(true)
    })
  })

  describe('onLeave', () => {
    test('pins the leaving node out of flow before the tween runs', () => {
      const el = document.createElement('div')
      toolbarSwap.onLeave(el, vi.fn())

      expect(el.style.position).toBe('absolute')
      const [, vars] = timelines[0].state.calls.to[0]
      expect(vars).toMatchObject({ opacity: 0 })
    })

    test('resolves done once the timeline completes', async () => {
      const el = document.createElement('div')
      let resolved = false
      const done = () => {
        resolved = true
      }

      toolbarSwap.onLeave(el, done)
      expect(resolved).toBe(false)

      timelines[0].play()
      await Promise.resolve()

      expect(resolved).toBe(true)
    })
  })
})
