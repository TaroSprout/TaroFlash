import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

// ── Hoisted gsap mock ──────────────────────────────────────────────────────────
// Each `gsap.timeline()` call gets its own fake timeline so tests can inspect
// exactly which elements/opts each `.to`/`.fromTo` call carries, and fire
// `onComplete` manually for the height tween instead of auto-resolving.

const { mockGsapSet, makeTimeline, timelines } = vi.hoisted(() => {
  const timelines = []
  function makeTimeline() {
    const calls = { to: [], fromTo: [] }
    const tl = {
      to: (...args) => {
        calls.to.push(args)
        return tl
      },
      fromTo: (...args) => {
        calls.fromTo.push(args)
        return tl
      },
      calls
    }
    timelines.push(tl)
    return tl
  }
  return { mockGsapSet: vi.fn(), makeTimeline, timelines }
})

vi.mock('gsap', () => ({
  gsap: {
    timeline: () => makeTimeline(),
    set: mockGsapSet
  }
}))

import { popScrimReveal } from '@/utils/animations/scrim-reveal'

beforeEach(() => {
  vi.clearAllMocks()
  timelines.length = 0
})

function el(scrollHeight = 200) {
  const node = document.createElement('div')
  Object.defineProperty(node, 'scrollHeight', { value: scrollHeight, configurable: true })
  return node
}

// ── incoming / outgoing layer selection [obligation] ──────────────────────────

describe('popScrimReveal — incoming/outgoing layer selection', () => {
  test('revealed=true fades the scrim out and pops the badge-content + fields in', () => {
    const scrim = el()
    const badge_content = el()
    const fields = el()
    popScrimReveal(scrim, badge_content, fields, true)

    const tl = timelines[0]
    expect(tl.calls.to[0][0]).toEqual([scrim])
    expect(tl.calls.fromTo[0][0]).toEqual([badge_content, fields])
  })

  test('revealed=false fades the badge-content + fields out and pops the scrim in', () => {
    const scrim = el()
    const badge_content = el()
    const fields = el()
    popScrimReveal(scrim, badge_content, fields, false)

    const tl = timelines[0]
    expect(tl.calls.to[0][0]).toEqual([badge_content, fields])
    expect(tl.calls.fromTo[0][0]).toEqual([scrim])
  })
})

// ── collapse option [obligation] ───────────────────────────────────────────────
// The height tween only runs when collapse: true (phones) — wider layouts hold
// a stable height driven by the fields layer, opacity/scale only.

describe('popScrimReveal — collapse option [obligation]', () => {
  test('without collapse, no height tween runs and overflow is never touched [obligation]', () => {
    popScrimReveal(el(), el(), el(150), true)

    expect(mockGsapSet).not.toHaveBeenCalled()
    // Only the shared badge-content+fields pop tween runs — no dedicated
    // fields-only height tween is appended.
    expect(timelines[0].calls.fromTo).toHaveLength(1)
  })

  test('collapse: true sets fields to overflow hidden before tweening height', () => {
    const fields = el(150)
    popScrimReveal(el(), el(), fields, true, { collapse: true })

    expect(mockGsapSet).toHaveBeenCalledWith(fields, { overflow: 'hidden' })
  })

  test('collapse + revealed=true tweens height from 0 to the natural scrollHeight [obligation]', () => {
    const fields = el(240)
    popScrimReveal(el(), el(), fields, true, { collapse: true })

    const tl = timelines[0]
    const [target, from, to] = tl.calls.fromTo.at(-1)
    expect(target).toBe(fields)
    expect(from).toMatchObject({ height: 0 })
    expect(to).toMatchObject({ height: 240 })
  })

  test('collapse + revealed=false tweens height from the natural scrollHeight down to 0 [obligation]', () => {
    const fields = el(240)
    popScrimReveal(el(), el(), fields, false, { collapse: true })

    const tl = timelines[0]
    const [target, from, to] = tl.calls.fromTo.at(-1)
    expect(target).toBe(fields)
    expect(from).toMatchObject({ height: 240 })
    expect(to).toMatchObject({ height: 0 })
  })
})

// ── inline height/overflow cleanup [obligation] ────────────────────────────────
// Deliberate bug fix: leaving height: 0 inline after a phone collapse would
// survive a resize to desktop and strand the panel collapsed. Cleared on
// complete for BOTH directions.

describe('popScrimReveal — clears inline height/overflow on complete, both directions [obligation]', () => {
  test('reveal (revealed=true): onComplete resets fields.style.height and .overflow [obligation]', () => {
    const fields = el(240)
    fields.style.height = '999px'
    fields.style.overflow = 'hidden'
    popScrimReveal(el(), el(), fields, true, { collapse: true })

    const tl = timelines[0]
    const [, , to] = tl.calls.fromTo.at(-1)
    to.onComplete()

    expect(fields.style.height).toBe('')
    expect(fields.style.overflow).toBe('')
  })

  test('hide (revealed=false): onComplete resets fields.style.height and .overflow [obligation]', () => {
    const fields = el(240)
    fields.style.height = '999px'
    fields.style.overflow = 'hidden'
    popScrimReveal(el(), el(), fields, false, { collapse: true })

    const tl = timelines[0]
    const [, , to] = tl.calls.fromTo.at(-1)
    to.onComplete()

    expect(fields.style.height).toBe('')
    expect(fields.style.overflow).toBe('')
  })
})

// ── clearProps on incoming only [obligation] ──────────────────────────────────
// The incoming layer's settled scale is visually a no-op but not a layout one
// — clear it so it stops being a containing block for popovers. The outgoing
// layer keeps its inline transform, since that's what holds it hidden.

describe('popScrimReveal — clearProps on incoming only [obligation]', () => {
  test('the incoming tween clears transform [obligation]', () => {
    popScrimReveal(el(), el(), el(), true)

    const [, , to] = timelines[0].calls.fromTo[0]
    expect(to.clearProps).toBe('transform')
  })

  test('the outgoing tween does not clear props [obligation]', () => {
    popScrimReveal(el(), el(), el(), true)

    const [, opts] = timelines[0].calls.to[0]
    expect(opts.clearProps).toBeUndefined()
  })
})

// ── return value ────────────────────────────────────────────────────────────────

describe('popScrimReveal — return value', () => {
  test('returns the gsap timeline instance it built', () => {
    const tl_returned = popScrimReveal(el(), el(), el(), true)
    expect(tl_returned).toBe(timelines[0])
  })
})
