import { describe, test, expect, beforeEach, afterEach, vi } from 'vite-plus/test'
import { createApp, ref } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockEmitSfx } = vi.hoisted(() => ({
  mockEmitSfx: vi.fn()
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx
}))

import { useReviewInboxTickSfx } from '@/views/dashboard/review-inbox/use-tick-sfx'

// ── DOM geometry helpers ──────────────────────────────────────────────────────
// cardPitch = firstElementChild.offsetWidth (96) + 4 gap = 100

function makeStripEl({ scrollWidth = 1000, clientWidth = 300, scrollLeft = 0 } = {}) {
  const el = document.createElement('div')
  const first_child = document.createElement('div')
  el.appendChild(first_child)

  Object.defineProperty(el, 'scrollWidth', { value: scrollWidth, configurable: true })
  Object.defineProperty(el, 'clientWidth', { value: clientWidth, configurable: true })
  Object.defineProperty(el, 'scrollLeft', { value: scrollLeft, configurable: true, writable: true })
  Object.defineProperty(first_child, 'offsetWidth', { value: 96, configurable: true })

  return el
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve))
}

async function scrollTo(el, left) {
  Object.defineProperty(el, 'scrollLeft', { value: left, configurable: true })
  el.dispatchEvent(new Event('scroll'))
  await nextFrame()
}

// ── Host app ──────────────────────────────────────────────────────────────────
// The composable relies on watch(..., { immediate: true }) + onBeforeUnmount, so
// it needs a real component lifecycle.

let app

function withSetup(el_ref) {
  app = createApp({
    setup() {
      useReviewInboxTickSfx(el_ref)
      return () => {}
    }
  })
  app.mount(document.createElement('div'))
}

beforeEach(() => {
  mockEmitSfx.mockClear()
})

afterEach(() => {
  app?.unmount()
  app = undefined
})

// ── Tick firing ───────────────────────────────────────────────────────────────

describe('useReviewInboxTickSfx — tick firing', () => {
  test('fires a tick exactly once when scrolling crosses one card-pitch boundary [obligation]', async () => {
    const el = makeStripEl()
    const el_ref = ref(el)
    withSetup(el_ref)

    await scrollTo(el, 100)

    expect(mockEmitSfx).toHaveBeenCalledTimes(1)
    expect(mockEmitSfx).toHaveBeenCalledWith('tap_05', { volume: 0.025 })
  })

  test('does not fire when the scroll delta stays within the same quantized index [obligation]', async () => {
    const el = makeStripEl()
    const el_ref = ref(el)
    withSetup(el_ref)

    await scrollTo(el, 40)

    expect(mockEmitSfx).not.toHaveBeenCalled()
  })
})

// ── Overscroll clamp ──────────────────────────────────────────────────────────

describe('useReviewInboxTickSfx — overscroll clamp [obligation]', () => {
  test('clamps scrollLeft above scrollWidth-clientWidth before quantizing, avoiding a spurious extra tick [obligation]', async () => {
    // max_scroll_left = 1000 - 300 = 700
    const el = makeStripEl({ scrollWidth: 1000, clientWidth: 300 })
    const el_ref = ref(el)
    withSetup(el_ref)

    // Rubber-band past the end — clamps to 700, index 7, differs from seeded 0 → one tick.
    await scrollTo(el, 1200)
    expect(mockEmitSfx).toHaveBeenCalledTimes(1)

    // Further rubber-banding still clamps to the same index 7 — no extra tick even
    // though the raw scrollLeft moved further out of bounds.
    await scrollTo(el, 1400)
    expect(mockEmitSfx).toHaveBeenCalledTimes(1)
  })

  test('clamps negative scrollLeft to 0 before quantizing', async () => {
    const el = makeStripEl()
    const el_ref = ref(el)
    withSetup(el_ref)

    await scrollTo(el, -50)

    expect(mockEmitSfx).not.toHaveBeenCalled()
  })
})

// ── Mount-time seeding ────────────────────────────────────────────────────────

describe('useReviewInboxTickSfx — seeds last_index from attach-time scrollLeft [obligation]', () => {
  test('mounting mid-scroll does not fire a spurious tick on the next scroll when the index is unchanged [obligation]', async () => {
    const el = makeStripEl({ scrollLeft: 300 })
    const el_ref = ref(el)
    withSetup(el_ref)

    // Same quantized index (3) as the attach-time scrollLeft — if last_index had
    // seeded from 0 instead, this would spuriously fire.
    await scrollTo(el, 300)

    expect(mockEmitSfx).not.toHaveBeenCalled()
  })
})

// ── Teardown ──────────────────────────────────────────────────────────────────

describe('useReviewInboxTickSfx — teardown', () => {
  test('removes the scroll listener when items_el switches to a different element', async () => {
    const el_a = makeStripEl()
    const el_b = makeStripEl()
    const el_ref = ref(el_a)
    withSetup(el_ref)

    el_ref.value = el_b
    await nextFrame()

    await scrollTo(el_a, 100)

    expect(mockEmitSfx).not.toHaveBeenCalled()
  })

  test('cancels the pending rAF and stops firing ticks after unmount', async () => {
    const el = makeStripEl()
    const el_ref = ref(el)
    withSetup(el_ref)

    app.unmount()
    app = undefined

    Object.defineProperty(el, 'scrollLeft', { value: 100, configurable: true })
    el.dispatchEvent(new Event('scroll'))
    await nextFrame()

    expect(mockEmitSfx).not.toHaveBeenCalled()
  })
})
