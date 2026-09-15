import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { makeTimeline, timelines, mockIsTweening, mockSet } = vi.hoisted(() => {
  const timelines = []
  function makeTimeline() {
    const state = {
      onComplete: null,
      calls: { to: [], fromTo: [] },
      progress_calls: [],
      kill_calls: 0
    }
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
      play: () => tl,
      progress: (...args) => {
        state.progress_calls.push(args)
        return tl
      },
      kill: () => {
        state.kill_calls++
        return tl
      },
      state
    }
    timelines.push(tl)
    return tl
  }
  return {
    makeTimeline,
    timelines,
    mockIsTweening: vi.fn(() => false),
    mockSet: vi.fn()
  }
})

vi.mock('gsap', () => ({
  gsap: { set: mockSet, to: vi.fn(), timeline: () => makeTimeline(), isTweening: mockIsTweening }
}))

const { mockUseMotionStore } = vi.hoisted(() => ({
  mockUseMotionStore: vi.fn(() => ({ factors: { duration: 1 } }))
}))
vi.mock('@/stores/motion', () => ({ useMotionStore: mockUseMotionStore }))

import { playEnter, playLeave } from '@/utils/animations/overlay'

function makeEl({ mode, downgraded } = {}) {
  const el = document.createElement('div')
  if (mode) el.dataset.overlayMode = mode
  if (downgraded) el.style.setProperty('--overlay-downgraded', '1')
  return el
}

describe('overlay animations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    timelines.length = 0
    mockIsTweening.mockReturnValue(false)
    mockUseMotionStore.mockReturnValue({ factors: { duration: 1 } })
  })

  describe('playEnter dispatch', () => {
    test('routes a popup-mode element to the popup enter motion', () => {
      playEnter(makeEl({ mode: 'popup' }))

      const [, from, to] = timelines[0].state.calls.fromTo[0]
      expect(from).toEqual({ scale: 0.8, opacity: 0 })
      expect(to).toMatchObject({ scale: 1, opacity: 1 })
    })

    test('routes a downgraded (sheet) element to the sheet enter motion', () => {
      playEnter(makeEl({ downgraded: true }))

      const [, from, to] = timelines[0].state.calls.fromTo[0]
      expect(from).toEqual({ translateY: '100%' })
      expect(to).toMatchObject({ translateY: 0 })
    })

    test('routes a plain element to the dialog enter motion', () => {
      playEnter(makeEl())

      const [, from, to] = timelines[0].state.calls.fromTo[0]
      expect(from).toEqual({ translateY: '200px', opacity: 0 })
      expect(to).toMatchObject({ translateY: 0, opacity: 1 })
    })
  })

  describe('playLeave dispatch', () => {
    test('routes a popup-mode element to the popup leave motion', () => {
      playLeave(makeEl({ mode: 'popup' }))

      expect(timelines[0].state.calls.fromTo).toHaveLength(0)
      const [, to] = timelines[0].state.calls.to[0]
      expect(to).toMatchObject({ scale: 0.8, opacity: 0 })
    })

    test('routes a downgraded (sheet) element to the sheet leave motion', () => {
      playLeave(makeEl({ downgraded: true }))

      expect(timelines[0].state.calls.fromTo).toHaveLength(0)
      const [, to] = timelines[0].state.calls.to[0]
      expect(to).toMatchObject({ translateY: '100%' })
    })

    test('routes a plain element to the dialog leave motion', () => {
      playLeave(makeEl())

      expect(timelines[0].state.calls.fromTo).toHaveLength(0)
      const [, to] = timelines[0].state.calls.to[0]
      expect(to).toMatchObject({ translateY: '200px', opacity: 0 })
    })
  })

  describe('enter clears the settled transform, leave keeps it', () => {
    test('dialog enter clears transform/opacity on completion', () => {
      playEnter(makeEl())
      timelines[0].state.onComplete()

      expect(mockSet).toHaveBeenCalledWith(expect.anything(), { clearProps: 'transform,opacity' })
    })

    test('dialog leave does not clear on completion — the receding surface keeps its transform', () => {
      playLeave(makeEl())
      timelines[0].state.onComplete()

      expect(mockSet).not.toHaveBeenCalled()
    })

    test('sheet enter clears transform/opacity on completion', () => {
      playEnter(makeEl({ downgraded: true }))
      timelines[0].state.onComplete()

      expect(mockSet).toHaveBeenCalledWith(expect.anything(), { clearProps: 'transform,opacity' })
    })

    test('sheet leave does not clear on completion', () => {
      playLeave(makeEl({ downgraded: true }))
      timelines[0].state.onComplete()

      expect(mockSet).not.toHaveBeenCalled()
    })

    test('popup enter clears transform/opacity on completion', () => {
      playEnter(makeEl({ mode: 'popup' }))
      timelines[0].state.onComplete()

      expect(mockSet).toHaveBeenCalledWith(expect.anything(), { clearProps: 'transform,opacity' })
    })

    test('popup leave does not clear on completion', () => {
      playLeave(makeEl({ mode: 'popup' }))
      timelines[0].state.onComplete()

      expect(mockSet).not.toHaveBeenCalled()
    })
  })

  describe('re-triggering mid-flight takes over instead of stacking a second copy', () => {
    test('playEnter tweens from live values (tl.to, not tl.fromTo) with overwrite auto when already tweening', () => {
      mockIsTweening.mockReturnValue(true)

      playEnter(makeEl())

      expect(timelines[0].state.calls.fromTo).toHaveLength(0)
      const [, to] = timelines[0].state.calls.to[0]
      expect(to).toMatchObject({ translateY: 0, opacity: 1, overwrite: 'auto' })
    })

    test('playLeave tweens from live values (tl.to, not tl.fromTo) with overwrite auto when already tweening', () => {
      mockIsTweening.mockReturnValue(true)

      playLeave(makeEl())

      expect(timelines[0].state.calls.fromTo).toHaveLength(0)
      const [, to] = timelines[0].state.calls.to[0]
      expect(to).toMatchObject({ translateY: '200px', opacity: 0, overwrite: 'auto' })
    })

    test('cancelling an in-flight leave snaps to completion instead of springing back', () => {
      const handle = playLeave(makeEl())

      handle.cancel()

      expect(timelines[0].state.progress_calls).toEqual([[1]])
      expect(timelines[0].state.kill_calls).toBe(0)
    })

    test('cancelling an in-flight enter does not snap-complete (hands back instead)', () => {
      const handle = playEnter(makeEl())

      handle.cancel()

      expect(timelines[0].state.progress_calls).toHaveLength(0)
      expect(timelines[0].state.kill_calls).toBe(1)
    })
  })

  describe('the returned handle', () => {
    test('resolves done when the timeline completes', async () => {
      const handle = playEnter(makeEl())
      const spy = vi.fn()
      handle.done.then(spy)

      timelines[0].state.onComplete()
      await Promise.resolve()
      await Promise.resolve()

      expect(spy).toHaveBeenCalledTimes(1)
    })
  })
})
