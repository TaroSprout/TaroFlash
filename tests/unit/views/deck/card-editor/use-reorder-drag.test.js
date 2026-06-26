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
  // [obligation] returns live delta for the dragged row, ±pitch for passed rows, 0 otherwise
  test('dragged row returns the current delta [obligation]', () => {
    const setup = withSetup(() =>
      useReorderDrag({ pitch: PITCH, count: () => 3, enabled: () => true, onReorder: vi.fn() })
    )
    app = setup.app
    const { result } = setup

    result.start(1, pointerEvent('pointerdown', { button: 0, clientY: 0 }))
    moveTo(66)

    expect(result.dragOffset(1)).toBe(66)
  })

  test('row shifted by a downward drag returns -pitch [obligation]', () => {
    const setup = withSetup(() =>
      useReorderDrag({ pitch: PITCH, count: () => 3, enabled: () => true, onReorder: vi.fn() })
    )
    app = setup.app
    const { result } = setup

    result.start(0, pointerEvent('pointerdown', { button: 0, clientY: 0 }))
    moveTo(66) // target → 1: row at index 1 shifts up

    expect(result.dragOffset(1)).toBe(-PITCH)
  })

  test('row shifted by an upward drag returns +pitch [obligation]', () => {
    const setup = withSetup(() =>
      useReorderDrag({ pitch: PITCH, count: () => 3, enabled: () => true, onReorder: vi.fn() })
    )
    app = setup.app
    const { result } = setup

    // Start at index 2 and drag up past 0.65 threshold toward index 1
    result.start(2, pointerEvent('pointerdown', { button: 0, clientY: 0 }))
    moveTo(-66) // delta=-66, ideal=2-0.66=1.34, crosses back to 1

    expect(result.dragOffset(1)).toBe(PITCH)
  })

  test('returns 0 for rows not in the drag window', () => {
    const setup = withSetup(() =>
      useReorderDrag({ pitch: PITCH, count: () => 5, enabled: () => true, onReorder: vi.fn() })
    )
    app = setup.app
    const { result } = setup

    result.start(1, pointerEvent('pointerdown', { button: 0, clientY: 0 }))
    moveTo(66) // target → 2

    expect(result.dragOffset(0)).toBe(0)
    expect(result.dragOffset(3)).toBe(0)
    expect(result.dragOffset(4)).toBe(0)
  })

  test('returns 0 for all rows when no drag is active', () => {
    const setup = withSetup(() =>
      useReorderDrag({ pitch: PITCH, count: () => 3, enabled: () => true, onReorder: vi.fn() })
    )
    app = setup.app
    const { result } = setup

    expect(result.dragOffset(0)).toBe(0)
    expect(result.dragOffset(1)).toBe(0)
    expect(result.dragOffset(2)).toBe(0)
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

describe('useReorderDrag — autoScroll and edgeDirection', () => {
  let rafSpy
  let scrollBySpy

  beforeEach(() => {
    // Fire the RAF callback exactly once to avoid the infinite step() loop.
    let fired = false
    rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
      if (!fired) {
        fired = true
        cb(0)
      }
      return 1
    })
    scrollBySpy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})
  })

  afterEach(() => {
    rafSpy.mockRestore()
    scrollBySpy.mockRestore()
  })

  test('scrolls up when pointer is in the top edge zone during a drag', () => {
    const setup = withSetup(() =>
      useReorderDrag({ pitch: PITCH, count: () => 3, enabled: () => true, onReorder: vi.fn() })
    )
    app = setup.app
    const { result } = setup

    // Start mid-list; move pointer to y=0 which is inside the top EDGE_ZONE (90px)
    result.start(1, pointerEvent('pointerdown', { button: 0, clientY: 400 }))
    moveTo(0)

    expect(scrollBySpy).toHaveBeenCalledWith(0, expect.any(Number))
    const [, dy] = scrollBySpy.mock.calls[0]
    expect(dy).toBeLessThan(0)
  })

  test('scrolls down when pointer is near the bottom edge', () => {
    const setup = withSetup(() =>
      useReorderDrag({ pitch: PITCH, count: () => 3, enabled: () => true, onReorder: vi.fn() })
    )
    app = setup.app
    const { result } = setup

    result.start(1, pointerEvent('pointerdown', { button: 0, clientY: 400 }))
    // Move to near bottom: window.innerHeight - EDGE_ZONE + 10 would be inside bottom zone
    const near_bottom = Math.max(window.innerHeight - 50, 400)
    moveTo(near_bottom)

    expect(scrollBySpy).toHaveBeenCalledWith(0, expect.any(Number))
    const [, dy] = scrollBySpy.mock.calls[0]
    expect(dy).toBeGreaterThan(0)
  })

  test('does not scroll when pointer is in the middle of the viewport', () => {
    const setup = withSetup(() =>
      useReorderDrag({ pitch: PITCH, count: () => 3, enabled: () => true, onReorder: vi.fn() })
    )
    app = setup.app
    const { result } = setup

    result.start(1, pointerEvent('pointerdown', { button: 0, clientY: 400 }))
    // middle of viewport: not in any edge zone (above 90 from top, above 90 from bottom)
    moveTo(Math.floor(window.innerHeight / 2))

    expect(scrollBySpy).not.toHaveBeenCalled()
  })

  test('ramps scroll speed up the longer the pointer dwells in the edge', () => {
    // Queue rAF callbacks so we can run frames at chosen timestamps and watch
    // the dwell-based speed tiers (afterMs 0 / 450 / 2000) escalate.
    const frames = []
    rafSpy.mockImplementation((cb) => frames.push(cb))
    const runFrame = (t) => frames.shift()?.(t)
    const lastSpeed = () => Math.abs(scrollBySpy.mock.calls.at(-1)[1])

    const setup = withSetup(() =>
      useReorderDrag({ pitch: PITCH, count: () => 10, enabled: () => true, onReorder: vi.fn() })
    )
    app = setup.app

    setup.result.start(1, pointerEvent('pointerdown', { button: 0, clientY: 400 }))
    moveTo(0) // top edge → schedules the first frame; dwell clock starts at t=0

    runFrame(0)
    const tier0 = lastSpeed()
    runFrame(500) // past the 450ms tier
    const tier1 = lastSpeed()
    runFrame(2500) // past the 2000ms tier
    const tier2 = lastSpeed()

    expect(tier1).toBeGreaterThan(tier0)
    expect(tier2).toBeGreaterThan(tier1)
  })
})
