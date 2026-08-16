import { computed, onBeforeUnmount, ref } from 'vue'
import { emitSfx } from '@/sfx/bus'

// Px from a viewport edge that triggers auto-scroll. →[K:reorder-drag-edge-scroll-ramp]
const EDGE_ZONE = 90

type EdgeTier = { afterMs: number; speed: number }
// Ramp tiers by dwell time; keep ascending by `afterMs`.
const EDGE_RAMP: EdgeTier[] = [
  { afterMs: 0, speed: 16 },
  { afterMs: 450, speed: 36 },
  { afterMs: 2000, speed: 64 }
]

// Slot-fraction margin the target must cross to flip. →[K:reorder-drag-hysteresis]
const HYSTERESIS = 0.15

const ZERO: ReorderOffset = { x: 0, y: 0 }

export type ReorderOffset = { x: number; y: number }

/** Maps the engine's pointer/slot math onto a list or a grid. */
export type ReorderGeometry = {
  /** Continuous ideal slot index for the dragged row at pointer delta (dx, dy) from pickup. */
  idealIndex: (from: number, dx: number, dy: number) => number
  /** Resting (x, y) px position of slot `index`. →[K:reorder-drag-gap-shift] */
  position: (index: number) => ReorderOffset
}

export type ReorderDragOptions = {
  count: () => number
  enabled: () => boolean
  // Px of fixed chrome covering the top of the list, offsetting the top edge zone. Defaults to 0.
  topInset?: () => number
  onReorder: (from: number, to: number) => void
  // Fixed row pitch for the 1-D vertical-list case; ignored when `geometry` is supplied.
  pitch?: number
  // Full layout strategy for a grid or non-uniform layout; takes precedence over `pitch`.
  geometry?: ReorderGeometry
  // Scroll ceiling, re-read each frame. →[K:reorder-drag-edge-scroll-ramp]
  maxScroll?: () => number
}

export type ReorderDrag = ReturnType<typeof useReorderDrag>

/** Vertical fixed-pitch geometry — the 1-D list case. */
function verticalGeometry(pitch: number): ReorderGeometry {
  return {
    idealIndex: (from, _dx, dy) => from + dy / pitch,
    position: (index) => ({ x: 0, y: index * pitch })
  }
}

/**
 * Pointer-driven drag-to-reorder engine for a uniform list or grid.
 *
 * Never moves or clones DOM — the caller applies `dragOffset(index)` as a `translate` on each row
 * and keeps the dragged row mounted through auto-scroll. Bind `start(index, event)` to a handle's
 * `pointerdown`.
 */
export function useReorderDrag(opts: ReorderDragOptions) {
  const { count, enabled, topInset, onReorder } = opts
  const geometry = opts.geometry ?? verticalGeometry(opts.pitch ?? 0)

  const from_index = ref<number | null>(null)
  const delta_x = ref(0)
  const delta_y = ref(0)

  let start_client_x = 0
  let start_client_y = 0
  let start_scroll_x = 0
  let start_scroll_y = 0
  let pointer_x = 0
  let pointer_y = 0
  let raf = 0

  // Fallback scroll ceiling, captured at pickup. →[K:reorder-drag-edge-scroll-ramp]
  let max_scroll_y = 0

  // Current edge dwell direction and when it began, for the scroll ramp.
  let edge_dir = 0
  let edge_since = 0

  const target_index = ref<number | null>(null)

  /** Px vector from slot `b`'s resting spot to slot `a`'s. →[K:reorder-drag-gap-shift] */
  function slotDelta(a: number, b: number): ReorderOffset {
    const pa = geometry.position(a)
    const pb = geometry.position(b)
    return { x: pa.x - pb.x, y: pa.y - pb.y }
  }

  /** Extra `translate` (px) the row at `index` should carry — pointer offset, gap shift, or none. */
  function dragOffset(index: number): ReorderOffset {
    const from = from_index.value
    const to = target_index.value
    if (from === null || to === null) return ZERO

    if (index === from) return { x: delta_x.value, y: delta_y.value }
    if (from < to && index > from && index <= to) return slotDelta(index - 1, index)
    if (to < from && index >= to && index < from) return slotDelta(index + 1, index)
    return ZERO
  }

  /** Whether the row at `index` should animate its offset — every row but the dragged one. */
  function shouldTransition(index: number): boolean {
    if (from_index.value === null) return false
    return index !== from_index.value
  }

  function updateDelta() {
    delta_x.value = pointer_x - start_client_x + (window.scrollX - start_scroll_x)
    delta_y.value = pointer_y - start_client_y + (window.scrollY - start_scroll_y)
    updateTarget()
  }

  // While-loops absorb fast multi-slot drags, one tick per real crossing. →[K:reorder-drag-hysteresis]
  function updateTarget() {
    if (from_index.value === null) return

    const last = count() - 1
    const ideal = geometry.idealIndex(from_index.value, delta_x.value, delta_y.value)
    let next = target_index.value ?? from_index.value

    while (ideal - next > 0.5 + HYSTERESIS && next < last) next++
    while (next - ideal > 0.5 + HYSTERESIS && next > 0) next--

    if (next === target_index.value) return
    if (target_index.value !== null) emitSfx('gesture.tick')
    target_index.value = next
  }

  // -1 top edge, +1 bottom edge, 0 neither; the top zone is offset by `topInset`.
  function edgeDirection(): number {
    if (pointer_y < (topInset?.() ?? 0) + EDGE_ZONE) return -1
    if (window.innerHeight - pointer_y < EDGE_ZONE) return 1
    return 0
  }

  // Drives page scroll while the pointer sits in an edge zone. →[K:reorder-drag-edge-scroll-ramp]
  function autoScroll() {
    if (raf) return

    const step = (now: number) => {
      const dir = edgeDirection()
      if (dir === 0 || from_index.value === null) {
        raf = 0
        edge_dir = 0
        return
      }

      if (dir !== edge_dir) {
        edge_dir = dir
        edge_since = now
      }

      const held = now - edge_since
      let tier = EDGE_RAMP[0]
      for (const t of EDGE_RAMP) if (held >= t.afterMs) tier = t
      const limit = opts.maxScroll ? Math.max(0, opts.maxScroll()) : max_scroll_y
      const target = Math.min(limit, Math.max(0, window.scrollY + dir * tier.speed))
      window.scrollTo(start_scroll_x, target)
      updateDelta()
      raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
  }

  function onMove(event: PointerEvent) {
    pointer_x = event.clientX
    pointer_y = event.clientY
    updateDelta()
    autoScroll()
  }

  // Swallows touch-scroll during a drag so the page doesn't pan under the finger.
  function preventTouchScroll(event: TouchEvent) {
    event.preventDefault()
  }

  function stopTracking() {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    document.body.style.userSelect = ''
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onEnd)
    window.removeEventListener('pointercancel', onEnd)
    window.removeEventListener('touchmove', preventTouchScroll)
  }

  function reset() {
    from_index.value = null
    target_index.value = null
    delta_x.value = 0
    delta_y.value = 0
  }

  function onEnd() {
    const from = from_index.value
    const to = target_index.value

    stopTracking()

    if (from !== null) emitSfx('ui.press')

    // Hand the new order over and clear the offsets in the same tick — split across
    // two, the row draws once back at its old spot and visibly snaps.
    // →[K:reorder-drag-commit-reset-sync]
    if (from !== null && to !== null && from !== to) onReorder(from, to)
    reset()
  }

  /** Begin a drag from `index`. Bind to a handle's `pointerdown`. */
  function start(index: number, event: PointerEvent) {
    if (!enabled() || event.button !== 0) return
    event.preventDefault()

    from_index.value = index
    target_index.value = index
    start_client_x = event.clientX
    start_client_y = event.clientY
    start_scroll_x = window.scrollX
    start_scroll_y = window.scrollY
    pointer_x = event.clientX
    pointer_y = event.clientY
    delta_x.value = 0
    delta_y.value = 0
    edge_dir = 0
    max_scroll_y = Math.max(
      0,
      document.documentElement.scrollHeight - document.documentElement.clientHeight
    )

    emitSfx('ui.press')
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onEnd)
    window.addEventListener('pointercancel', onEnd)
    window.addEventListener('touchmove', preventTouchScroll, { passive: false })
  }

  onBeforeUnmount(stopTracking)

  return {
    dragging_index: computed(() => from_index.value),
    target_index,
    dragOffset,
    shouldTransition,
    start
  }
}
