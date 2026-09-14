import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { flushPromises } from '@vue/test-utils'

// ── Hoisted gsap mock ──────────────────────────────────────────────────────────
// Each `gsap.timeline()` call gets its own fake timeline so tests can inspect
// exactly which elements/opts each `.to`/`.fromTo` call carries.

const { makeTimeline, timelines } = vi.hoisted(() => {
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
  return { makeTimeline, timelines }
})

vi.mock('gsap', () => ({
  gsap: {
    timeline: () => makeTimeline()
  }
}))

import { popScrimReveal } from '@/utils/animations/scrim-reveal'

beforeEach(() => {
  timelines.length = 0
})

function el(scrollHeight = 200) {
  const node = document.createElement('div')
  Object.defineProperty(node, 'scrollHeight', { value: scrollHeight, configurable: true })
  return node
}

function deferredDriveHeight() {
  let resolve
  const settled = new Promise((r) => (resolve = r))
  const change = { settled, cancel: vi.fn() }
  const driveHeight = vi.fn(() => change)
  return { driveHeight, change, resolve }
}

// ── incoming / outgoing layer selection ──────────────────────────

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

// ── clearProps on incoming only ──────────────────────────────────
// The incoming layer's settled scale is visually a no-op but not a layout one
// — clear it so it stops being a containing block for popovers. The outgoing
// layer keeps its inline transform, since that's what holds it hidden.

describe('popScrimReveal — clearProps on incoming only', () => {
  test('the incoming tween clears transform', () => {
    popScrimReveal(el(), el(), el(), true)

    const [, , to] = timelines[0].calls.fromTo[0]
    expect(to.clearProps).toBe('transform')
  })

  test('the outgoing tween does not clear props', () => {
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

// ── driveHeight wiring ────────────────────────────────────────────
// The height tween is now delegated to the stage's own driver — popScrimReveal
// only computes the target and hands it off, never touching overflow or
// building its own height tween.

describe('popScrimReveal — driveHeight wiring', () => {
  test('collapse + driveHeight + revealed=true drives to the fields natural scrollHeight', () => {
    const fields = el(240)
    const { driveHeight } = deferredDriveHeight()

    popScrimReveal(el(), el(), fields, true, { collapse: true, driveHeight })

    expect(driveHeight).toHaveBeenCalledWith(240, { duration: 0.32, ease: 'power2.inOut' })
  })

  test('collapse + driveHeight + revealed=false drives down to 0', () => {
    const fields = el(240)
    const { driveHeight } = deferredDriveHeight()

    popScrimReveal(el(), el(), fields, false, { collapse: true, driveHeight })

    expect(driveHeight).toHaveBeenCalledWith(0, { duration: 0.32, ease: 'power2.inOut' })
  })

  test('collapse: true but no driveHeight returns the timeline early without driving height', () => {
    const fields = el(240)
    const tl_returned = popScrimReveal(el(), el(), fields, true, { collapse: true })

    expect(tl_returned).toBe(timelines[0])
    expect(timelines[0].calls.fromTo).toHaveLength(1)
  })

  test('collapse: false with driveHeight present never calls driveHeight', () => {
    const fields = el(240)
    const { driveHeight } = deferredDriveHeight()

    popScrimReveal(el(), el(), fields, true, { collapse: false, driveHeight })

    expect(driveHeight).not.toHaveBeenCalled()
  })
})

// ── reveal target measured off content, not the clamped fields box ─
// The outer `fields` box carries the max-md:h-0 collapse clamp; a flex column
// clamped to height:0 shrinks its children, so `fields.scrollHeight`
// under-reports. The unclamped `content` element is measured instead.

describe('popScrimReveal — reveal target measured off content', () => {
  test('drives to the content element scrollHeight when content is passed, not the fields scrollHeight', () => {
    const fields = el(100)
    const content = el(300)
    const { driveHeight } = deferredDriveHeight()

    popScrimReveal(el(), el(), fields, true, { collapse: true, driveHeight, content })

    expect(driveHeight).toHaveBeenCalledWith(300, { duration: 0.32, ease: 'power2.inOut' })
  })

  test('regression guard: content keeps its natural height while fields is clamped to the max-md:h-0 shrink', () => {
    const fields = el(0)
    const content = el(350)
    const { driveHeight } = deferredDriveHeight()

    popScrimReveal(el(), el(), fields, true, { collapse: true, driveHeight, content })

    expect(driveHeight).toHaveBeenCalledWith(350, { duration: 0.32, ease: 'power2.inOut' })
  })

  test('falls back to fields.scrollHeight when no content option is passed', () => {
    const fields = el(240)
    const { driveHeight } = deferredDriveHeight()

    popScrimReveal(el(), el(), fields, true, { collapse: true, driveHeight })

    expect(driveHeight).toHaveBeenCalledWith(240, { duration: 0.32, ease: 'power2.inOut' })
  })
})

// ── settled cleanup, live vs superseded ───────────────────────────
// A change's settled promise clears the inline height it left behind — but
// only when it's still the live change for that element. A change superseded
// by a later call must not stomp the newer tween's inline height.

describe('popScrimReveal — settled cleanup clears the live change only', () => {
  test('the live change clears fields.style.height once settled resolves', async () => {
    const fields = el(240)
    fields.style.height = '120px'
    const { driveHeight, resolve } = deferredDriveHeight()

    popScrimReveal(el(), el(), fields, true, { collapse: true, driveHeight })
    resolve()
    await flushPromises()

    expect(fields.style.height).toBe('')
  })

  test('the live change clears fields.style.height once settled, even when a content option was passed', async () => {
    const fields = el(0)
    const content = el(350)
    fields.style.height = '120px'
    const { driveHeight, resolve } = deferredDriveHeight()

    popScrimReveal(el(), el(), fields, true, { collapse: true, driveHeight, content })
    resolve()
    await flushPromises()

    expect(fields.style.height).toBe('')
  })

  test('a superseded change settling does not clear the live tween height, but the live one does once it settles', async () => {
    const fields = el(240)
    const first = deferredDriveHeight()
    const second = deferredDriveHeight()

    popScrimReveal(el(), el(), fields, true, { collapse: true, driveHeight: first.driveHeight })
    popScrimReveal(el(), el(), fields, false, { collapse: true, driveHeight: second.driveHeight })

    fields.style.height = '77px'
    first.resolve()
    await flushPromises()

    expect(fields.style.height).toBe('77px')

    second.resolve()
    await flushPromises()

    expect(fields.style.height).toBe('')
  })
})
