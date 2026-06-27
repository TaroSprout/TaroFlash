import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createApp } from 'vue'

// jsdom does not implement PointerEvent; shim it as a MouseEvent subclass so
// clientY / button are readable and window.dispatchEvent works correctly.
if (!globalThis.PointerEvent) {
  globalThis.PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type, init = {}) {
      super(type, init)
    }
  }
}

// ── Mocks ─────────────────────────────────────────────────────────────────────

const { emitSfxMock } = vi.hoisted(() => ({ emitSfxMock: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: emitSfxMock }))

import { useReorderDrag } from '@/views/deck/card-editor/use-reorder-drag'

// ── Helpers ───────────────────────────────────────────────────────────────────

const PITCH = 100

/**
 * Mount the composable inside a minimal app so onBeforeUnmount fires correctly,
 * then return the composable's API and the app for teardown.
 */
function withSetup(composable) {
  let result
  const app = createApp({
    setup() {
      result = composable()
      return () => {}
    }
  })
  app.mount(document.createElement('div'))
  return { result, app }
}

function pointerEvent(type, { clientY = 0, button = 0 } = {}) {
  return new PointerEvent(type, { bubbles: true, clientY, button })
}

function moveTo(clientY) {
  window.dispatchEvent(pointerEvent('pointermove', { clientY }))
}

function pointerUp() {
  window.dispatchEvent(pointerEvent('pointerup'))
}

let app

afterEach(() => {
  app?.unmount()
  app = null
  emitSfxMock.mockReset()
  // Clean up any lingering window listeners by dispatching a cancel event
  window.dispatchEvent(pointerEvent('pointercancel'))
})

// ── start() — guard conditions ────────────────────────────────────────────────

describe('useReorderDrag — start()', () => {
  // [obligation] no-op when enabled() is false
  test('does nothing when enabled() returns false [obligation]', () => {
    const onReorder = vi.fn()
    const setup = withSetup(() =>
      useReorderDrag({
        pitch: PITCH,
        count: () => 3,
        enabled: () => false,
        onReorder
      })
    )
    app = setup.app
    const { result } = setup

    result.start(1, pointerEvent('pointerdown', { button: 0, clientY: 100 }))

    expect(result.dragging_index.value).toBeNull()
    expect(emitSfxMock).not.toHaveBeenCalled()
  })

  // [obligation] no-op when event.button !== 0
  test('does nothing when event.button is not 0 [obligation]', () => {
    const setup = withSetup(() =>
      useReorderDrag({ pitch: PITCH, count: () => 3, enabled: () => true, onReorder: vi.fn() })
    )
    app = setup.app
    const { result } = setup

    result.start(1, pointerEvent('pointerdown', { button: 2, clientY: 100 }))

    expect(result.dragging_index.value).toBeNull()
    expect(emitSfxMock).not.toHaveBeenCalled()
  })

  test('sets dragging_index and target_index to the given index on start', () => {
    const setup = withSetup(() =>
      useReorderDrag({ pitch: PITCH, count: () => 3, enabled: () => true, onReorder: vi.fn() })
    )
    app = setup.app
    const { result } = setup

    result.start(2, pointerEvent('pointerdown', { button: 0, clientY: 100 }))

    expect(result.dragging_index.value).toBe(2)
    expect(result.target_index.value).toBe(2)
  })

  // [obligation] emits generic_button_15 on drag start
  test('emits generic_button_15 on successful start [obligation]', () => {
    const setup = withSetup(() =>
      useReorderDrag({ pitch: PITCH, count: () => 3, enabled: () => true, onReorder: vi.fn() })
    )
    app = setup.app
    const { result } = setup

    result.start(1, pointerEvent('pointerdown', { button: 0, clientY: 100 }))

    expect(emitSfxMock).toHaveBeenCalledWith('generic_button_15')
    expect(emitSfxMock).toHaveBeenCalledTimes(1)
  })
})

// ── hysteresis — target_index and tap_05 gating ───────────────────────────────

describe('useReorderDrag — hysteresis', () => {
  let result

  beforeEach(() => {
    const setup = withSetup(() =>
      useReorderDrag({
        pitch: PITCH,
        count: () => 3,
        enabled: () => true,
        onReorder: vi.fn()
      })
    )
    app = setup.app
    result = setup.result
    // Start drag from index 1 at clientY=0
    result.start(1, pointerEvent('pointerdown', { button: 0, clientY: 0 }))
    emitSfxMock.mockClear()
  })

  // [obligation] within 0.65*pitch: target_index stays unchanged, no tap_05
  test('target_index stays at from when delta < 0.65*pitch [obligation]', () => {
    // 0.5 + HYSTERESIS(0.15) = 0.65 → need ideal - next > 0.65 to advance
    // At delta=65: ideal = 1 + 65/100 = 1.65, 1.65 - 1 = 0.65 which is NOT > 0.65
    moveTo(65)

    expect(result.target_index.value).toBe(1)
    expect(emitSfxMock).not.toHaveBeenCalled()
  })

  test('target_index advances to next slot when delta crosses the 0.65*pitch boundary [obligation]', () => {
    // At delta=66: ideal = 1.66, 1.66 - 1 = 0.66 > 0.65 → advances to 2
    moveTo(66)

    expect(result.target_index.value).toBe(2)
    expect(emitSfxMock).toHaveBeenCalledWith('tap_05')
    expect(emitSfxMock).toHaveBeenCalledTimes(1)
  })

  // [obligation] boundary jitter must not double-fire the crossing tick
  test('moving back within the hysteresis band does not fire another tap_05 [obligation]', () => {
    // Cross forward: target flips to 2
    moveTo(66)
    emitSfxMock.mockClear()

    // Move back to 65 — ideal=1.65, next=2, 2-1.65=0.35 which is NOT > 0.65 → stays at 2
    moveTo(65)

    expect(result.target_index.value).toBe(2)
    expect(emitSfxMock).not.toHaveBeenCalled()
  })

  test('tap_05 fires again only after the reverse threshold (0.65 back) is crossed', () => {
    moveTo(66) // target → 2, tap fires
    emitSfxMock.mockClear()

    // Need to move back far enough: 2 - ideal > 0.65, so ideal < 1.35, delta < 35
    moveTo(34)

    expect(result.target_index.value).toBe(1)
    expect(emitSfxMock).toHaveBeenCalledWith('tap_05')
    expect(emitSfxMock).toHaveBeenCalledTimes(1)
  })

  // [obligation] no tap_05 on the initial pickup that seeds target = from
  test('no tap_05 is emitted when target is seeded to from on start [obligation]', () => {
    // emitSfxMock was cleared after start(); no tap_05 should have fired during start
    expect(emitSfxMock).not.toHaveBeenCalled()
  })
})

// ── sfx contract ──────────────────────────────────────────────────────────────

describe('useReorderDrag — sfx contract', () => {
  // [obligation] snappy_button_5 fires on drop
  test('emits snappy_button_5 on pointerup (drop) [obligation]', () => {
    const setup = withSetup(() =>
      useReorderDrag({ pitch: PITCH, count: () => 3, enabled: () => true, onReorder: vi.fn() })
    )
    app = setup.app
    const { result } = setup

    result.start(1, pointerEvent('pointerdown', { button: 0, clientY: 0 }))
    emitSfxMock.mockClear()

    pointerUp()

    expect(emitSfxMock).toHaveBeenCalledWith('snappy_button_5')
  })

  // [obligation] tap_05 only when target_index changes between two non-null slots
  test('tap_05 fires once per genuine slot crossing, not on drop [obligation]', () => {
    const setup = withSetup(() =>
      useReorderDrag({ pitch: PITCH, count: () => 3, enabled: () => true, onReorder: vi.fn() })
    )
    app = setup.app
    const { result } = setup

    result.start(0, pointerEvent('pointerdown', { button: 0, clientY: 0 }))
    emitSfxMock.mockClear()

    moveTo(66) // crosses into slot 1 → one tap_05
    pointerUp()

    const tap_calls = emitSfxMock.mock.calls.filter((c) => c[0] === 'tap_05')
    const drop_calls = emitSfxMock.mock.calls.filter((c) => c[0] === 'snappy_button_5')
    expect(tap_calls).toHaveLength(1)
    expect(drop_calls).toHaveLength(1)
  })
})

// ── onReorder — called only when from !== to ──────────────────────────────────

describe('useReorderDrag — onReorder callback', () => {
  // [obligation] onReorder called only when from !== to
  test('calls onReorder with (from, to) when drop position differs from start [obligation]', () => {
    const onReorder = vi.fn()
    const setup = withSetup(() =>
      useReorderDrag({ pitch: PITCH, count: () => 3, enabled: () => true, onReorder })
    )
    app = setup.app
    const { result } = setup

    result.start(0, pointerEvent('pointerdown', { button: 0, clientY: 0 }))
    moveTo(66) // → target 1
    pointerUp()

    expect(onReorder).toHaveBeenCalledWith(0, 1)
  })

  test('does NOT call onReorder when drop position equals start position [obligation]', () => {
    const onReorder = vi.fn()
    const setup = withSetup(() =>
      useReorderDrag({ pitch: PITCH, count: () => 3, enabled: () => true, onReorder })
    )
    app = setup.app
    const { result } = setup

    result.start(1, pointerEvent('pointerdown', { button: 0, clientY: 0 }))
    // No movement — from and to are both 1
    pointerUp()

    expect(onReorder).not.toHaveBeenCalled()
  })
})

// ── dragOffset ────────────────────────────────────────────────────────────────

describe('useReorderDrag — dragOffset(index)', () => {
  // dragOffset now returns {x, y} (ReorderOffset) rather than a bare number.
  // The vertical pitch geometry yields x=0 for all shifts; only y carries the delta.

  // [obligation] dragged row returns the live pointer delta as {x, y}
  test('dragged row returns the current delta as {x, y} [obligation]', () => {
    const setup = withSetup(() =>
      useReorderDrag({ pitch: PITCH, count: () => 3, enabled: () => true, onReorder: vi.fn() })
    )
    app = setup.app
    const { result } = setup

    result.start(1, pointerEvent('pointerdown', { button: 0, clientY: 0 }))
    moveTo(66)

    // delta_x=0 (no horizontal pointer movement), delta_y=66
    expect(result.dragOffset(1)).toEqual({ x: 0, y: 66 })
  })

  // [obligation] from < to: every card in (from, to] shifts by {x:0, y:-pitch} (toward the gap)
  test('row shifted by a downward drag (from<to) returns {x:0, y:-pitch} [obligation]', () => {
    const setup = withSetup(() =>
      useReorderDrag({ pitch: PITCH, count: () => 3, enabled: () => true, onReorder: vi.fn() })
    )
    app = setup.app
    const { result } = setup

    result.start(0, pointerEvent('pointerdown', { button: 0, clientY: 0 }))
    moveTo(66) // target → 1: row at index 1 is in (0,1] → shifts toward from=0 (upward)

    expect(result.dragOffset(1)).toEqual({ x: 0, y: -PITCH })
  })

  // [obligation] to < from: every card in [to, from) shifts by {x:0, y:+pitch} (toward the gap)
  test('row shifted by an upward drag (to<from) returns {x:0, y:+pitch} [obligation]', () => {
    const setup = withSetup(() =>
      useReorderDrag({ pitch: PITCH, count: () => 3, enabled: () => true, onReorder: vi.fn() })
    )
    app = setup.app
    const { result } = setup

    // Start at index 2 and drag up past 0.65 threshold toward index 1
    result.start(2, pointerEvent('pointerdown', { button: 0, clientY: 0 }))
    moveTo(-66) // delta=-66, ideal=2-0.66=1.34, crosses back to 1

    expect(result.dragOffset(1)).toEqual({ x: 0, y: PITCH })
  })

  test('all cards in (from, to] shift when dragging downward across multiple slots', () => {
    const setup = withSetup(() =>
      useReorderDrag({ pitch: PITCH, count: () => 5, enabled: () => true, onReorder: vi.fn() })
    )
    app = setup.app
    const { result } = setup

    result.start(0, pointerEvent('pointerdown', { button: 0, clientY: 0 }))
    // ideal=2.0 (200/100): 2-0>0.65→1, 2-1>0.65→2, 2-2=0 NOT>0.65 → target=2
    // range (from=0, to=2] = indices 1 and 2; index 3 is outside
    moveTo(200)

    expect(result.dragOffset(1)).toEqual({ x: 0, y: -PITCH })
    expect(result.dragOffset(2)).toEqual({ x: 0, y: -PITCH })
    expect(result.dragOffset(3)).toEqual({ x: 0, y: 0 }) // outside range
  })

  test('returns {x:0,y:0} for rows not in the drag window', () => {
    const setup = withSetup(() =>
      useReorderDrag({ pitch: PITCH, count: () => 5, enabled: () => true, onReorder: vi.fn() })
    )
    app = setup.app
    const { result } = setup

    result.start(1, pointerEvent('pointerdown', { button: 0, clientY: 0 }))
    moveTo(66) // target → 2

    expect(result.dragOffset(0)).toEqual({ x: 0, y: 0 })
    expect(result.dragOffset(3)).toEqual({ x: 0, y: 0 })
    expect(result.dragOffset(4)).toEqual({ x: 0, y: 0 })
  })

  test('returns {x:0,y:0} for all rows when no drag is active', () => {
    const setup = withSetup(() =>
      useReorderDrag({ pitch: PITCH, count: () => 3, enabled: () => true, onReorder: vi.fn() })
    )
    app = setup.app
    const { result } = setup

    expect(result.dragOffset(0)).toEqual({ x: 0, y: 0 })
    expect(result.dragOffset(1)).toEqual({ x: 0, y: 0 })
    expect(result.dragOffset(2)).toEqual({ x: 0, y: 0 })
  })
})

// ── shouldTransition ─────────────────────────────────────────────────────────

describe('useReorderDrag — shouldTransition(index)', () => {
  test('returns false for all indices when no drag is active', () => {
    const setup = withSetup(() =>
      useReorderDrag({ pitch: PITCH, count: () => 3, enabled: () => true, onReorder: vi.fn() })
    )
    app = setup.app
    const { result } = setup

    expect(result.shouldTransition(0)).toBe(false)
    expect(result.shouldTransition(1)).toBe(false)
  })

  test('returns false for the dragged row index during a drag', () => {
    const setup = withSetup(() =>
      useReorderDrag({ pitch: PITCH, count: () => 3, enabled: () => true, onReorder: vi.fn() })
    )
    app = setup.app
    const { result } = setup

    result.start(1, pointerEvent('pointerdown', { button: 0, clientY: 0 }))
    expect(result.shouldTransition(1)).toBe(false)
  })

  test('returns true for non-dragged rows during a drag (they animate to open the gap)', () => {
    const setup = withSetup(() =>
      useReorderDrag({ pitch: PITCH, count: () => 3, enabled: () => true, onReorder: vi.fn() })
    )
    app = setup.app
    const { result } = setup

    result.start(1, pointerEvent('pointerdown', { button: 0, clientY: 0 }))
    expect(result.shouldTransition(0)).toBe(true)
    expect(result.shouldTransition(2)).toBe(true)
  })
})

// ── state resets on drop ──────────────────────────────────────────────────────

describe('useReorderDrag — state reset on drop', () => {
  test('dragging_index returns null after drop', () => {
    const setup = withSetup(() =>
      useReorderDrag({ pitch: PITCH, count: () => 3, enabled: () => true, onReorder: vi.fn() })
    )
    app = setup.app
    const { result } = setup

    result.start(1, pointerEvent('pointerdown', { button: 0, clientY: 0 }))
    pointerUp()

    expect(result.dragging_index.value).toBeNull()
  })

  test('target_index returns null after drop', () => {
    const setup = withSetup(() =>
      useReorderDrag({ pitch: PITCH, count: () => 3, enabled: () => true, onReorder: vi.fn() })
    )
    app = setup.app
    const { result } = setup

    result.start(1, pointerEvent('pointerdown', { button: 0, clientY: 0 }))
    moveTo(66)
    pointerUp()

    expect(result.target_index.value).toBeNull()
  })
})

// ── autoScroll / edgeDirection — edge zone scroll behaviour ──────────────────
// The engine uses window.scrollTo(x, absoluteTarget) not scrollBy(dx, dy).
// Target = clamp(scrollY + dir*speed, 0, max_scroll_y).

describe('useReorderDrag — autoScroll and edgeDirection', () => {
  let rafSpy
  let scrollToSpy

  beforeEach(() => {
    // Give jsdom a scrollable content area so max_scroll_y > 0.
    // scrollHeight - clientHeight = 10000 - 600 = 9400 → max_scroll_y = 9400.
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 10000
    })
    Object.defineProperty(document.documentElement, 'clientHeight', {
      configurable: true,
      value: 600
    })

    // Fire the RAF callback exactly once to avoid the infinite step() loop.
    let fired = false
    rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
      if (!fired) {
        fired = true
        cb(0)
      }
      return 1
    })
    scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })

  afterEach(() => {
    rafSpy.mockRestore()
    scrollToSpy.mockRestore()
    // Restore jsdom defaults
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 0
    })
    Object.defineProperty(document.documentElement, 'clientHeight', {
      configurable: true,
      value: 0
    })
  })

  test('scrolls toward position 0 (top) when pointer is in the top edge zone', () => {
    const setup = withSetup(() =>
      useReorderDrag({ pitch: PITCH, count: () => 3, enabled: () => true, onReorder: vi.fn() })
    )
    app = setup.app
    const { result } = setup

    // Start mid-list; move pointer to y=0 which is inside the top EDGE_ZONE (90px)
    result.start(1, pointerEvent('pointerdown', { button: 0, clientY: 400 }))
    moveTo(0)

    // dir=-1, target = max(0, scrollY-16) = max(0, 0-16) = 0 (clamped at top)
    expect(scrollToSpy).toHaveBeenCalledWith(0, 0)
  })

  test('scrolls to a positive position when pointer is near the bottom edge', () => {
    const setup = withSetup(() =>
      useReorderDrag({ pitch: PITCH, count: () => 3, enabled: () => true, onReorder: vi.fn() })
    )
    app = setup.app
    const { result } = setup

    result.start(1, pointerEvent('pointerdown', { button: 0, clientY: 400 }))
    const near_bottom = Math.max(window.innerHeight - 50, 400)
    moveTo(near_bottom)

    // dir=+1, target = min(9400, 0+16) = 16 > 0
    expect(scrollToSpy).toHaveBeenCalledWith(0, expect.any(Number))
    const [, y] = scrollToSpy.mock.calls[0]
    expect(y).toBeGreaterThan(0)
  })

  test('does not call scrollTo when pointer is in the middle of the viewport', () => {
    const setup = withSetup(() =>
      useReorderDrag({ pitch: PITCH, count: () => 3, enabled: () => true, onReorder: vi.fn() })
    )
    app = setup.app
    const { result } = setup

    result.start(1, pointerEvent('pointerdown', { button: 0, clientY: 400 }))
    moveTo(Math.floor(window.innerHeight / 2))

    expect(scrollToSpy).not.toHaveBeenCalled()
  })

  test('ramps scroll speed up the longer the pointer dwells in the edge', () => {
    // Queue rAF callbacks so we can run frames at chosen timestamps and watch
    // the dwell-based speed tiers (afterMs 0=16 / 450=36 / 2000=64) escalate.
    const frames = []
    rafSpy.mockImplementation((cb) => frames.push(cb))
    const runFrame = (t) => frames.shift()?.(t)
    // scrollTo(x, absoluteTarget) — target increases as speed tier escalates
    const lastPos = () => scrollToSpy.mock.calls.at(-1)[1]

    const setup = withSetup(() =>
      useReorderDrag({ pitch: PITCH, count: () => 10, enabled: () => true, onReorder: vi.fn() })
    )
    app = setup.app

    setup.result.start(1, pointerEvent('pointerdown', { button: 0, clientY: 400 }))
    const near_bottom = Math.max(window.innerHeight - 50, 400)
    moveTo(near_bottom) // bottom edge → schedules the first frame; dwell clock starts at t=0

    runFrame(0) // tier 0 (speed=16) → scrollTo(0, 16)
    const tier0 = lastPos()
    runFrame(500) // past the 450ms tier (speed=36)
    const tier1 = lastPos()
    runFrame(2500) // past the 2000ms tier (speed=64)
    const tier2 = lastPos()

    expect(tier1).toBeGreaterThan(tier0)
    expect(tier2).toBeGreaterThan(tier1)
  })
})

// ── max_scroll_y capture and clamp [obligation] ───────────────────────────────

describe('useReorderDrag — max_scroll_y runaway guard [obligation]', () => {
  test('auto-scroll target is clamped to max_scroll_y captured at drag start [obligation]', () => {
    // max_scroll_y = scrollHeight - clientHeight = 800 - 600 = 200
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 800
    })
    Object.defineProperty(document.documentElement, 'clientHeight', {
      configurable: true,
      value: 600
    })

    const frames = []
    const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
      frames.push(cb)
      return frames.length
    })
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})

    const setup = withSetup(() =>
      useReorderDrag({ pitch: PITCH, count: () => 10, enabled: () => true, onReorder: vi.fn() })
    )
    app = setup.app
    setup.result.start(1, pointerEvent('pointerdown', { button: 0, clientY: 400 }))
    // Trigger bottom-edge auto-scroll
    const near_bottom = Math.max(window.innerHeight - 50, 400)
    moveTo(near_bottom)

    // Run two frames to accumulate scrollTo calls
    frames.shift()?.(0)
    frames.shift()?.(50)

    // Every scrollTo call must have second arg ≤ max_scroll_y = 200
    expect(scrollToSpy).toHaveBeenCalled()
    scrollToSpy.mock.calls.forEach(([, y]) => {
      expect(y).toBeLessThanOrEqual(200)
    })

    rafSpy.mockRestore()
    scrollToSpy.mockRestore()
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 0
    })
    Object.defineProperty(document.documentElement, 'clientHeight', {
      configurable: true,
      value: 0
    })
  })
})

// ── maxScroll option tracks content loaded mid-drag [obligation] ──────────────
// Regression: auto-scroll used to clamp to the scrollHeight captured at pickup,
// so when infinite-scroll loaded more rows mid-drag the page stopped scrolling
// at the old bottom. The `maxScroll` getter is re-read each frame from a
// transform-immune source (the virtualizer total size) so it grows with content.

describe('useReorderDrag — maxScroll option [obligation]', () => {
  test('clamps to the live maxScroll getter and resumes when it grows [obligation]', () => {
    // Captured fallback would pin at scrollHeight - clientHeight = 700 - 600 = 100.
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 700
    })
    Object.defineProperty(document.documentElement, 'clientHeight', {
      configurable: true,
      value: 600
    })

    // Real scrolling so the target can climb past the captured ceiling.
    let scrollY = 0
    const scrollYSpy = vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => scrollY)
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation((_x, y) => {
      scrollY = y
    })

    const frames = []
    const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
      frames.push(cb)
      return frames.length
    })

    let max = 500
    const setup = withSetup(() =>
      useReorderDrag({
        pitch: PITCH,
        count: () => 100,
        enabled: () => true,
        onReorder: vi.fn(),
        maxScroll: () => max
      })
    )
    app = setup.app
    setup.result.start(1, pointerEvent('pointerdown', { button: 0, clientY: 400 }))
    const near_bottom = Math.max(window.innerHeight - 50, 400)
    moveTo(near_bottom)

    // Drive frames until it settles at the initial getter ceiling.
    for (let i = 0; i < 80 && scrollY < max; i++) frames.shift()?.(i * 16)
    expect(scrollY).toBeGreaterThan(100) // blew past the stale captured fallback
    expect(scrollY).toBeLessThanOrEqual(500) // clamped to the live getter

    // Content loads → getter grows → auto-scroll resumes past the old ceiling.
    max = 5000
    for (let i = 0; i < 40; i++) frames.shift()?.(2000 + i * 16)
    expect(scrollY).toBeGreaterThan(500)

    rafSpy.mockRestore()
    scrollToSpy.mockRestore()
    scrollYSpy.mockRestore()
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 0
    })
    Object.defineProperty(document.documentElement, 'clientHeight', {
      configurable: true,
      value: 0
    })
  })
})

// ── touch-scroll suppression [obligation] ─────────────────────────────────────

describe('useReorderDrag — touch-scroll suppression [obligation]', () => {
  test('start() attaches a non-passive touchmove listener; stopTracking() removes it [obligation]', () => {
    const addEventSpy = vi.spyOn(window, 'addEventListener')
    const removeEventSpy = vi.spyOn(window, 'removeEventListener')

    const setup = withSetup(() =>
      useReorderDrag({ pitch: PITCH, count: () => 3, enabled: () => true, onReorder: vi.fn() })
    )
    app = setup.app

    // Clear spy history accumulated during withSetup / app.mount
    addEventSpy.mockClear()
    removeEventSpy.mockClear()

    setup.result.start(1, pointerEvent('pointerdown', { button: 0, clientY: 0 }))

    // touchmove must have been added with { passive: false }
    const touchmoveAdd = addEventSpy.mock.calls.find(([type]) => type === 'touchmove')
    expect(touchmoveAdd).toBeDefined()
    expect(touchmoveAdd[2]).toEqual({ passive: false })

    // Drop the drag → stopTracking() runs → listener must be removed
    pointerUp()

    const touchmoveRemove = removeEventSpy.mock.calls.find(([type]) => type === 'touchmove')
    expect(touchmoveRemove).toBeDefined()

    addEventSpy.mockRestore()
    removeEventSpy.mockRestore()
  })
})

// ── 2-D geometry [obligation] ─────────────────────────────────────────────────

describe('useReorderDrag — 2-D grid geometry [obligation]', () => {
  const COLUMNS = 3
  const CELL_PITCH = 100
  const ROW_PITCH = 120

  // A minimal 3-column grid geometry: uniform cells, no clamping at row edges.
  function makeGridGeometry() {
    return {
      idealIndex: (from, dx, dy) => {
        const row = Math.floor(from / COLUMNS) + dy / ROW_PITCH
        const col = (from % COLUMNS) + dx / CELL_PITCH
        return row * COLUMNS + Math.min(COLUMNS - 1, Math.max(0, col))
      },
      position: (index) => ({
        x: (index % COLUMNS) * CELL_PITCH,
        y: Math.floor(index / COLUMNS) * ROW_PITCH
      })
    }
  }

  let result

  beforeEach(() => {
    const setup = withSetup(() =>
      useReorderDrag({
        geometry: makeGridGeometry(),
        count: () => 9, // 3 rows × 3 columns
        enabled: () => true,
        onReorder: vi.fn()
      })
    )
    app = setup.app
    result = setup.result
    emitSfxMock.mockClear()
  })

  test('geometry: horizontal delta of one cell-pitch maps ideal to from+1 [obligation]', () => {
    const geo = makeGridGeometry()
    // from=0, dx=CELL_PITCH, dy=0 → col = 0+1 = 1, row = 0 → ideal = 1 ≈ from+1
    expect(geo.idealIndex(0, CELL_PITCH, 0)).toBeCloseTo(1)
  })

  test('geometry: vertical delta of one row-pitch maps ideal to from+columns [obligation]', () => {
    const geo = makeGridGeometry()
    // from=0, dx=0, dy=ROW_PITCH → col = 0, row = 0+1 = 1 → ideal = 3 = from+columns
    expect(geo.idealIndex(0, 0, ROW_PITCH)).toBeCloseTo(COLUMNS)
  })

  test('horizontal drag advances target_index by 1 column through the engine [obligation]', () => {
    result.start(0, pointerEvent('pointerdown', { button: 0, clientY: 0 }))
    // dx = 0.66 * CELL_PITCH → ideal = 0.66 > 0.65 threshold → target flips to 1
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        clientX: Math.round(0.66 * CELL_PITCH),
        clientY: 0
      })
    )
    expect(result.target_index.value).toBe(1)
  })

  test('vertical drag advances target_index by at least columns through the engine [obligation]', () => {
    result.start(0, pointerEvent('pointerdown', { button: 0, clientY: 0 }))
    // dy = 1.66 * ROW_PITCH → ideal = 1.66*3 = 4.98 → target advances to at least 3
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        clientX: 0,
        clientY: Math.round(1.66 * ROW_PITCH)
      })
    )
    expect(result.target_index.value).toBeGreaterThanOrEqual(COLUMNS)
  })

  test('gap-shift for card at a row-start wraps to previous row last slot: +x, -y [obligation]', () => {
    // Drag from index 0 down so target reaches ≥ COLUMNS (3).
    result.start(0, pointerEvent('pointerdown', { button: 0, clientY: 0 }))
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        clientX: 0,
        clientY: Math.round(1.66 * ROW_PITCH)
      })
    )
    // target ≥ 3. Index 3 is the first slot of row 1.
    // dragOffset(3) = slotDelta(2, 3) = position(2) - position(3)
    //   position(2) = {x: 2*100, y: 0}   (row 0, col 2 — end of prev row)
    //   position(3) = {x: 0,     y: 120} (row 1, col 0)
    //   slotDelta   = {x: +200,  y: -120} → positive x, negative y
    const offset = result.dragOffset(3)
    expect(offset.x).toBeGreaterThan(0) // slides right toward end of prev row
    expect(offset.y).toBeLessThan(0) // slides up into the previous row
  })
})
