import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { ref } from 'vue'

// ── Hoisted GSAP mock ──────────────────────────────────────────────────────────
// Stable fn refs are captured in the factory closure so they survive
// vi.resetModules() — the factory re-runs but returns the same instances.

const { mockFromTo, mockTo } = vi.hoisted(() => ({
  mockFromTo: vi.fn((_el, _from, to) => to?.onComplete?.()),
  mockTo: vi.fn((_el, opts) => opts?.onComplete?.())
}))

vi.mock('gsap', () => ({
  gsap: { fromTo: mockFromTo, to: mockTo }
}))

// route-slide.ts carries module-level `leave_pending` state. Reset the module
// before every test so each test starts with leave_pending = false.
beforeEach(async () => {
  vi.resetModules()
  mockFromTo.mockClear()
  mockFromTo.mockImplementation((_el, _from, to) => to?.onComplete?.())
  mockTo.mockClear()
  mockTo.mockImplementation((_el, opts) => opts?.onComplete?.())
})

async function fresh() {
  return import('@/utils/animations/route-slide')
}

// ── routeSlideLeave ────────────────────────────────────────────────────────────

describe('routeSlideLeave', () => {
  test('positions element absolutely to overlay during leave', async () => {
    const { routeSlideLeave } = await fresh()
    const el = document.createElement('div')

    routeSlideLeave(ref(false))(el, vi.fn())

    expect(el.style.position).toBe('absolute')
    expect(el.style.width).toBe('100%')
  })

  test('calls done via GSAP onComplete', async () => {
    const { routeSlideLeave } = await fresh()
    const el = document.createElement('div')
    const done = vi.fn()

    routeSlideLeave(ref(false))(el, done)

    expect(done).toHaveBeenCalledOnce()
  })

  test('slides element right (+100%) when going_to_dashboard is true', async () => {
    const { routeSlideLeave } = await fresh()
    const el = document.createElement('div')

    routeSlideLeave(ref(true))(el, vi.fn())

    expect(mockTo).toHaveBeenCalledWith(el, expect.objectContaining({ x: '100%' }))
  })

  test('slides element left (-100%) when going_to_dashboard is false', async () => {
    const { routeSlideLeave } = await fresh()
    const el = document.createElement('div')

    routeSlideLeave(ref(false))(el, vi.fn())

    expect(mockTo).toHaveBeenCalledWith(el, expect.objectContaining({ x: '-100%' }))
  })

  test('sets parent minHeight to lock the layout height during animation', async () => {
    const { routeSlideLeave } = await fresh()
    const parent = document.createElement('div')
    const el = document.createElement('div')
    parent.appendChild(el)

    // Don't call onComplete here — we want to observe the mid-animation state
    mockTo.mockImplementationOnce(() => {})

    routeSlideLeave(ref(false))(el, vi.fn())

    // jsdom always returns 0 for offsetHeight; the '0px' value is still forwarded
    expect(parent.style.minHeight).toBe('0px')
  })

  test('clears parent minHeight in onComplete callback', async () => {
    const { routeSlideLeave } = await fresh()
    const parent = document.createElement('div')
    const el = document.createElement('div')
    parent.appendChild(el)

    routeSlideLeave(ref(false))(el, vi.fn())

    // mockTo calls onComplete synchronously, so cleanup already ran
    expect(parent.style.minHeight).toBe('')
  })
})

// ── routeSlideEnter — leave_pending = false (obligation 1) ────────────────────

describe('routeSlideEnter — leave_pending is false (no preceding leave)', () => {
  test('calls done immediately without running GSAP animation [obligation]', async () => {
    const { routeSlideEnter } = await fresh()
    const animation_done = ref(false)
    const done = vi.fn()

    routeSlideEnter(ref(false), ref(false), animation_done)(document.createElement('div'), done)

    expect(done).toHaveBeenCalledOnce()
    expect(mockFromTo).not.toHaveBeenCalled()
  })

  test('sets animation_done to true immediately when skipping [obligation]', async () => {
    const { routeSlideEnter } = await fresh()
    const animation_done = ref(false)

    routeSlideEnter(ref(false), ref(false), animation_done)(document.createElement('div'), vi.fn())

    expect(animation_done.value).toBe(true)
  })
})

// ── routeSlideEnter — is_initial = true gate (obligation 2) ───────────────────

describe('routeSlideEnter — is_initial is true (first page load)', () => {
  test('calls done immediately on initial render [obligation]', async () => {
    const { routeSlideEnter } = await fresh()
    const done = vi.fn()

    routeSlideEnter(ref(false), ref(true), ref(false))(document.createElement('div'), done)

    expect(done).toHaveBeenCalledOnce()
    expect(mockFromTo).not.toHaveBeenCalled()
  })

  test('sets animation_done to true immediately on initial render [obligation]', async () => {
    const { routeSlideEnter } = await fresh()
    const animation_done = ref(false)

    routeSlideEnter(ref(false), ref(true), animation_done)(document.createElement('div'), vi.fn())

    expect(animation_done.value).toBe(true)
  })

  test('skips animation even when a leave happened to fire before [obligation]', async () => {
    const { routeSlideLeave, routeSlideEnter } = await fresh()
    // Trigger a leave to set leave_pending = true
    routeSlideLeave(ref(false))(document.createElement('div'), vi.fn())
    mockFromTo.mockClear()

    // Now enter with is_initial = true — should still skip the animation
    const done = vi.fn()
    routeSlideEnter(ref(false), ref(true), ref(false))(document.createElement('div'), done)

    expect(done).toHaveBeenCalledOnce()
    expect(mockFromTo).not.toHaveBeenCalled()
  })
})

// ── routeSlideEnter — full animation path (obligation 5) ──────────────────────

describe('routeSlideEnter — preceded by a leave (animation path)', () => {
  test('runs GSAP fromTo animation when leave_pending and not initial [obligation]', async () => {
    const { routeSlideLeave, routeSlideEnter } = await fresh()
    const el = document.createElement('div')

    routeSlideLeave(ref(false))(document.createElement('div'), vi.fn())
    mockFromTo.mockClear()

    routeSlideEnter(ref(false), ref(false), ref(false))(el, vi.fn())

    expect(mockFromTo).toHaveBeenCalledOnce()
  })

  test('sets animation_done to true inside onComplete [obligation]', async () => {
    const { routeSlideLeave, routeSlideEnter } = await fresh()
    const animation_done = ref(false)

    routeSlideLeave(ref(false))(document.createElement('div'), vi.fn())
    routeSlideEnter(ref(false), ref(false), animation_done)(document.createElement('div'), vi.fn())

    expect(animation_done.value).toBe(true)
  })

  test('calls done inside onComplete [obligation]', async () => {
    const { routeSlideLeave, routeSlideEnter } = await fresh()
    const done = vi.fn()

    routeSlideLeave(ref(false))(document.createElement('div'), vi.fn())
    routeSlideEnter(ref(false), ref(false), ref(false))(document.createElement('div'), done)

    expect(done).toHaveBeenCalledOnce()
  })

  test('slides in from left (-100%) when going_to_dashboard is false', async () => {
    const { routeSlideLeave, routeSlideEnter } = await fresh()

    routeSlideLeave(ref(false))(document.createElement('div'), vi.fn())
    mockFromTo.mockClear()
    routeSlideEnter(ref(false), ref(false), ref(false))(document.createElement('div'), vi.fn())

    expect(mockFromTo).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ x: '100%' }),
      expect.anything()
    )
  })

  test('slides in from right (+100%) when going_to_dashboard is true', async () => {
    const { routeSlideLeave, routeSlideEnter } = await fresh()

    routeSlideLeave(ref(true))(document.createElement('div'), vi.fn())
    mockFromTo.mockClear()
    routeSlideEnter(ref(true), ref(false), ref(false))(document.createElement('div'), vi.fn())

    expect(mockFromTo).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ x: '-100%' }),
      expect.anything()
    )
  })

  test('does not run animation a second time without a new leave', async () => {
    const { routeSlideLeave, routeSlideEnter } = await fresh()

    routeSlideLeave(ref(false))(document.createElement('div'), vi.fn())
    routeSlideEnter(ref(false), ref(false), ref(false))(document.createElement('div'), vi.fn())
    mockFromTo.mockClear()

    // Second enter with no preceding leave — should skip
    const done = vi.fn()
    routeSlideEnter(ref(false), ref(false), ref(false))(document.createElement('div'), done)

    expect(mockFromTo).not.toHaveBeenCalled()
    expect(done).toHaveBeenCalledOnce()
  })
})
