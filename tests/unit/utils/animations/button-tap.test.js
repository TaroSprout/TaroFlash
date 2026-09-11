import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { makeTimeline, timelines, mockIsTweening, mockSet } = vi.hoisted(() => {
  const timelines = []
  function makeTimeline() {
    const state = { onComplete: null, calls: { to: [], call: [] }, killed: false }
    const tl = {
      to: (...args) => {
        state.calls.to.push(args)
        return tl
      },
      fromTo: (...args) => {
        state.calls.to.push(args)
        return tl
      },
      call: (fn, params, position) => {
        state.calls.call.push({ fn, position })
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
  return { makeTimeline, timelines, mockIsTweening: vi.fn(() => false), mockSet: vi.fn() }
})

vi.mock('gsap', () => ({
  gsap: {
    timeline: () => makeTimeline(),
    isTweening: mockIsTweening,
    set: mockSet
  }
}))

const { mockUseMotionStore } = vi.hoisted(() => ({
  mockUseMotionStore: vi.fn(() => ({ factors: { duration: 1 } }))
}))
vi.mock('@/stores/motion', () => ({ useMotionStore: mockUseMotionStore }))

import { BUTTON_TAP_DURATION, playButtonTap, playButtonSweep } from '@/utils/animations/button-tap'

function el() {
  return document.createElement('div')
}

beforeEach(() => {
  vi.clearAllMocks()
  timelines.length = 0
  mockUseMotionStore.mockReturnValue({ factors: { duration: 1 } })
})

describe('playButtonTap — non-yoyo (default)', () => {
  test('tweens scale and rotate with expo.out easing over BUTTON_TAP_DURATION', () => {
    playButtonTap(el())
    const [, vars] = timelines[0].state.calls.to[0]
    expect(vars).toMatchObject({
      scale: 1.2,
      rotate: 3,
      duration: BUTTON_TAP_DURATION,
      ease: 'expo.out'
    })
  })

  test('forwards a custom duration', () => {
    playButtonTap(el(), { duration: 0.5 })
    const [, vars] = timelines[0].state.calls.to[0]
    expect(vars.duration).toBe(0.5)
  })

  test('peak and done both resolve once the timeline completes', async () => {
    const handle = playButtonTap(el())
    let peak_resolved = false
    let done_resolved = false
    void handle.mark('peak').then(() => (peak_resolved = true))
    void handle.done.then(() => (done_resolved = true))

    expect(peak_resolved).toBe(false)
    expect(done_resolved).toBe(false)

    timelines[0].progress(1)
    await handle.mark('peak')
    await handle.done

    expect(peak_resolved).toBe(true)
    expect(done_resolved).toBe(true)
  })

  test('peak and done both resolve on cancel() before completion', async () => {
    const handle = playButtonTap(el())

    handle.cancel()

    await expect(handle.mark('peak')).resolves.toBeUndefined()
    await expect(handle.done).resolves.toBeUndefined()
    expect(timelines[0].state.killed).toBe(true)
  })
})

describe('playButtonTap — yoyo', () => {
  test('builds an up tween, a peak mark at step+hold, then a return tween', () => {
    playButtonTap(el(), { yoyo: true, duration: 0.4, hold: 0.5 })

    expect(timelines[0].state.calls.to).toHaveLength(2)
    const [, up_vars] = timelines[0].state.calls.to[0]
    const [, down_vars] = timelines[0].state.calls.to[1]
    expect(up_vars).toMatchObject({ scale: 1.3, rotate: 3, duration: 0.2 })
    expect(down_vars).toMatchObject({ scale: 1, rotate: 0, duration: 0.2 })
    expect(timelines[0].state.calls.call[0].position).toBe(0.7) // step (0.2) + hold (0.5)
  })

  test('peak resolves before done, both settle on the timeline finishing', async () => {
    const handle = playButtonTap(el(), { yoyo: true, duration: 0.4, hold: 0.1 })
    let peak_resolved = false
    void handle.mark('peak').then(() => (peak_resolved = true))

    timelines[0].state.calls.call[0].fn()
    await handle.mark('peak')
    expect(peak_resolved).toBe(true)

    timelines[0].progress(1)
    await expect(handle.done).resolves.toBeUndefined()
  })

  test('peak and done both resolve on cancel() mid-flight', async () => {
    const handle = playButtonTap(el(), { yoyo: true })

    handle.cancel()

    await expect(handle.mark('peak')).resolves.toBeUndefined()
    await expect(handle.done).resolves.toBeUndefined()
  })
})

describe('playButtonSweep', () => {
  test('runs a plain hold tween for the given duration with no visual change', () => {
    playButtonSweep(el(), 0.3)
    const [, vars] = timelines[0].state.calls.to[0]
    expect(vars.duration).toBe(0.3)
  })

  test('defaults duration to BUTTON_TAP_DURATION', () => {
    playButtonSweep(el())
    const [, vars] = timelines[0].state.calls.to[0]
    expect(vars.duration).toBe(BUTTON_TAP_DURATION)
  })

  test('done resolves once the timeline completes', async () => {
    const handle = playButtonSweep(el())
    timelines[0].progress(1)
    await expect(handle.done).resolves.toBeUndefined()
  })

  test('done resolves and the timeline is killed on cancel()', async () => {
    const handle = playButtonSweep(el())

    handle.cancel()

    await expect(handle.done).resolves.toBeUndefined()
    expect(timelines[0].state.killed).toBe(true)
  })

  test('does not promote will-change (promote: false)', () => {
    const element = el()
    playButtonSweep(element)
    expect(element.style.willChange).toBe('')
  })
})

test('BUTTON_TAP_DURATION is a positive number', () => {
  expect(BUTTON_TAP_DURATION).toBeGreaterThan(0)
})
