import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { effectScope } from 'vue'

// ── Hoisted gsap mock ──────────────────────────────────────────────────────────
// Each `gsap.timeline()` call gets its own fake timeline that records `to`/
// `fromTo`/`call` invocations and only fires `onComplete` when `progress(1)` is
// invoked — the driver only ever plays a paused timeline and never runs a real
// tween, so the fake stands in for the whole GSAP timeline surface it uses.

const { makeTimeline, timelines, mockIsTweening, mockSet } = vi.hoisted(() => {
  const timelines = []
  function makeTimeline() {
    const state = { onComplete: null, calls: { to: [], fromTo: [], call: [] }, killed: false }
    const tl = {
      to: (...args) => {
        state.calls.to.push(args)
        return tl
      },
      fromTo: (...args) => {
        state.calls.fromTo.push(args)
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

import { defineMotion, motion } from '@/utils/motion/driver'

function el() {
  return document.createElement('div')
}

beforeEach(() => {
  vi.clearAllMocks()
  timelines.length = 0
  mockIsTweening.mockReturnValue(false)
  mockUseMotionStore.mockReturnValue({ factors: { duration: 1 } })
})

describe('defineMotion handle', () => {
  test('done resolves once the timeline reports complete', async () => {
    const handle = defineMotion({ to: { opacity: 1 }, duration: 200 })(el())
    let resolved = false
    void handle.done.then(() => {
      resolved = true
    })

    expect(resolved).toBe(false)
    timelines[0].progress(1)
    await handle.done

    expect(resolved).toBe(true)
  })

  test('mark(name) resolves once the timeline reaches its registered fraction point', async () => {
    const handle = defineMotion({
      to: { opacity: 1 },
      duration: 200,
      marks: { midpoint: 0.5 }
    })(el())

    let resolved = false
    void handle.mark('midpoint').then(() => {
      resolved = true
    })
    expect(resolved).toBe(false)

    const registered = timelines[0].state.calls.call[0]
    expect(registered.position).toBeCloseTo(0.1) // 0.2s duration * 0.5 fraction
    registered.fn()
    await handle.mark('midpoint')

    expect(resolved).toBe(true)
  })

  test('mark for an unknown name rejects', async () => {
    const handle = defineMotion({ to: { opacity: 1 }, duration: 200 })(el())

    await expect(handle.mark('nope')).rejects.toThrow('motion has no mark named "nope"')
  })
})

describe('takeover', () => {
  test('starts the tween from current values, skipping the from placement, mid-flight', () => {
    mockIsTweening.mockReturnValue(true)

    defineMotion({ from: { opacity: 0 }, to: { opacity: 1 }, duration: 200 })(el())

    expect(timelines[0].state.calls.fromTo).toHaveLength(0)
    expect(timelines[0].state.calls.to).toHaveLength(1)
  })

  test('without a tween already running, a spec with a from placement primes via fromTo', () => {
    mockIsTweening.mockReturnValue(false)

    defineMotion({ from: { opacity: 0 }, to: { opacity: 1 }, duration: 200 })(el())

    expect(timelines[0].state.calls.fromTo).toHaveLength(1)
    expect(timelines[0].state.calls.to).toHaveLength(0)
  })
})

describe('cancel()', () => {
  test('clears the inline transform + opacity, clears will-change, and resolves done', async () => {
    const element = el()
    const handle = defineMotion({ to: { opacity: 1 }, duration: 200 })(element)
    expect(element.style.willChange).toBe('transform, opacity')

    handle.cancel()

    expect(timelines[0].state.killed).toBe(true)
    expect(mockSet).toHaveBeenCalledWith(element, { clearProps: 'transform,opacity' })
    expect(element.style.willChange).toBe('')
    await expect(handle.done).resolves.toBeUndefined()
  })

  test('is a no-op once the motion has already settled', () => {
    const element = el()
    const handle = defineMotion({ to: { opacity: 1 }, duration: 200 })(element)
    handle.cancel()
    mockSet.mockClear()

    handle.cancel()

    expect(mockSet).not.toHaveBeenCalled()
  })
})

describe("interrupt: 'snap-complete'", () => {
  test('cancel jumps a leave to its end instead of killing it, with no clearProps and no pop-back', async () => {
    const element = el()
    const handle = defineMotion({
      to: { translateY: '200px', opacity: 0 },
      duration: 200,
      interrupt: 'snap-complete'
    })(element)

    handle.cancel()

    expect(timelines[0].state.killed).toBe(false)
    expect(mockSet).not.toHaveBeenCalled()
    expect(element.style.willChange).toBe('')
    await expect(handle.done).resolves.toBeUndefined()
  })
})

describe('finish()', () => {
  test('settles at the end state without clearing the transform', async () => {
    const element = el()
    const handle = defineMotion({ to: { opacity: 1 }, duration: 200 })(element)

    handle.finish()

    expect(mockSet).not.toHaveBeenCalled()
    expect(element.style.willChange).toBe('')
    await expect(handle.done).resolves.toBeUndefined()
  })
})

describe('settle idempotency', () => {
  test('a second completion after settle does not re-clear props or re-resolve', async () => {
    const element = el()
    const handle = defineMotion({ to: { opacity: 1 }, duration: 200, clearOnComplete: true })(
      element
    )

    timelines[0].progress(1)
    mockSet.mockClear()
    timelines[0].progress(1)

    expect(mockSet).not.toHaveBeenCalled()
    await expect(handle.done).resolves.toBeUndefined()
  })
})

describe('scope binding', () => {
  test('a motion started inside an effect scope cancels on scope disposal', async () => {
    const scope = effectScope()
    let handle
    scope.run(() => {
      handle = defineMotion({ to: { opacity: 1 }, duration: 200 })(el())
    })

    scope.stop()

    expect(timelines[0].state.killed).toBe(true)
    await expect(handle.done).resolves.toBeUndefined()
  })

  test('a motion started outside any effect scope is unaffected by scope disposal elsewhere', () => {
    const handle = defineMotion({ to: { opacity: 1 }, duration: 200 })(el())

    expect(timelines[0].state.killed).toBe(false)
    expect(handle).toBeDefined()
  })
})

describe('promote lifecycle', () => {
  test('sets will-change on start and clears it once the motion completes', () => {
    const element = el()
    defineMotion({ to: { opacity: 1 }, duration: 200 })(element)
    expect(element.style.willChange).toBe('transform, opacity')

    timelines[0].progress(1)

    expect(element.style.willChange).toBe('')
  })

  test('clears will-change on cancel', () => {
    const element = el()
    const handle = defineMotion({ to: { opacity: 1 }, duration: 200 })(element)

    handle.cancel()

    expect(element.style.willChange).toBe('')
  })

  test('clears will-change on finish', () => {
    const element = el()
    const handle = defineMotion({ to: { opacity: 1 }, duration: 200 })(element)

    handle.finish()

    expect(element.style.willChange).toBe('')
  })

  test('promote:false never sets will-change on start or settle', () => {
    const element = el()
    defineMotion({ to: { opacity: 1 }, duration: 200, promote: false })(element)
    expect(element.style.willChange).toBe('')

    timelines[0].progress(1)

    expect(element.style.willChange).toBe('')
  })
})

describe('tier scaling', () => {
  test('duration multiplies by the active tier factors.duration', () => {
    mockUseMotionStore.mockReturnValue({ factors: { duration: 0.5 } })
    const element = el()

    defineMotion({ to: { opacity: 1 }, duration: 200 })(element)

    const [, vars] = timelines[0].state.calls.to[0]
    expect(vars.duration).toBeCloseTo(0.1) // 200ms = 0.2s, scaled by 0.5
  })

  test('a full tier factor leaves the duration unscaled', () => {
    mockUseMotionStore.mockReturnValue({ factors: { duration: 1 } })

    defineMotion({ to: { opacity: 1 }, duration: 300 })(el())

    const [, vars] = timelines[0].state.calls.to[0]
    expect(vars.duration).toBeCloseTo(0.3)
  })
})

describe('motion() imperative escape hatch', () => {
  test('hands the element and context to the build function', () => {
    const element = el()
    const build = vi.fn((_el, ctx) => {
      ctx.tl.to(_el, { opacity: 1, duration: ctx.duration(200), ease: ctx.ease('out') })
    })

    motion(build)(element)

    expect(build).toHaveBeenCalledWith(element, expect.objectContaining({ tl: timelines[0] }))
    const [, vars] = timelines[0].state.calls.to[0]
    expect(vars.ease).toBe('power2.out')
  })

  test('exposes travel tokens resolved through the vocabulary', () => {
    let travelled
    motion((_el, ctx) => {
      travelled = ctx.travel(16)
    })(el())

    expect(travelled).toBe(16)
  })
})
