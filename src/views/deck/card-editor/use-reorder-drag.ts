import { computed, onBeforeUnmount, ref } from 'vue'
import { emitSfx } from '@/sfx/bus'

// Auto-scroll kicks in when the pointer is within this many px of a viewport
// edge, advancing the page so a row can be dragged past the visible window.
// Speed ramps through these tiers the longer the drag dwells in the edge
// without leaving or switching direction — pick the last tier whose `afterMs`
// has elapsed. Keep ascending by `afterMs`.
const EDGE_ZONE = 90

type EdgeTier = { afterMs: number; speed: number }
const EDGE_RAMP: EdgeTier[] = [
  { afterMs: 0, speed: 16 },
  { afterMs: 450, speed: 36 },
  { afterMs: 2000, speed: 64 }
]

// Slots-past-midpoint the drag must travel before the target flips, and the
// matching deadzone that keeps sub-pixel jitter at a boundary from re-flipping
// (and double-firing the crossing tick).
const HYSTERESIS = 0.15

const ZERO: ReorderOffset = { x: 0, y: 0 }

export type ReorderOffset = { x: number; y: number }

/**
 * Layout strategy that adapts the engine to a list or a grid. The engine itself
 * is geometry-blind: it tracks the pointer, steps a target slot with hysteresis,
 * auto-scrolls at the edges, and plays the sfx — everything that should never
 * drift between the list and the grid. Only this mapping differs between them.
 */
export type ReorderGeometry = {
  // Continuous ideal slot index for the dragged row given its origin index and
  // the pointer delta (px) from pickup. Whole-number results map to a slot; the
  // engine steps the live target toward this with hysteresis.
  idealIndex: (from: number, dx: number, dy: number) => number
  // Resting (x, y) px position of slot `index`. The engine derives gap-shift
  // offsets from the difference between neighbouring slots — so a card wrapping
  // at a grid-row edge animates to the next row for free, with no grid-specific
  // code in the engine.
  position: (index: number) => ReorderOffset
}

export type ReorderDragOptions = {
  count: () => number
  enabled: () => boolean
  // Px of fixed chrome (e.g. a sticky toolbar) covering the top of the list.
  // The top edge zone is offset by this so auto-scroll-up triggers at the
  // visible list top, not behind the chrome. Defaults to 0.
  topInset?: () => number
  // Commit the reorder: move the row at `from` to land at index `to`. Expected
  // to reorder the rendered list synchronously (optimistic cache write), so the
  // engine can drop its drag state in the same tick without a snap-back.
  onReorder: (from: number, to: number) => void
  // Fixed row pitch in px for the 1-D vertical-list case — a convenience that
  // builds a vertical `geometry`. Ignored when `geometry` is supplied.
  pitch?: number
  // Full layout strategy — supply for a grid (or any non-uniform layout). Takes
  // precedence over `pitch`.
  geometry?: ReorderGeometry
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
 * Designed to coexist with a virtualizer: it never moves or clones DOM. The
 * caller renders rows as usual and applies `dragOffset(index)` as an extra
 * `translate` on each row. The dragged row follows the pointer 1:1; the rows it
 * passes shift by one slot to open a gap. The caller is responsible for keeping
 * the dragged row mounted (e.g. via the virtualizer's `rangeExtractor`) so it
 * survives auto-scroll out of the overscan window.
 *
 * Lifecycle: bind `start(index, event)` to a handle's `pointerdown`. The engine
 * attaches window-level move/up listeners for the drag duration and tears them
 * down on drop, cancel, or unmount.
 *
 * @example
 * // 1-D list
 * const reorder = useReorderDrag({
 *   pitch: ROW_PITCH,
 *   count: () => all_cards.value.length,
 *   enabled: () => is_above_md.value,
 *   onReorder: (from, to) => editor.reorderCard(from, to)
 * })
 *
 * @example
 * // 2-D grid
 * const reorder = useReorderDrag({
 *   geometry: { idealIndex, position },
 *   count: () => cards.value.length,
 *   enabled: () => is_rearranging.value,
 *   onReorder: editor.reorderCard
 * })
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

  // Max page scrollY, captured at pickup before the dragged row's transform can
  // pollute it. A translated row counts toward scrollable overflow in some
  // browsers, so reading the live scrollHeight mid-drag would let auto-scroll
  // chase its own tail forever off the end of the content.
  let max_scroll_y = 0

  // Direction of the current continuous edge dwell (-1 up / +1 down / 0 none)
  // and the rAF timestamp it began at, used to ramp the scroll speed.
  let edge_dir = 0
  let edge_since = 0

  // Live drop slot. Stateful (not a pure round) so it can carry hysteresis:
  // updated by `updateTarget` as the drag translate changes.
  const target_index = ref<number | null>(null)

  // (x, y) px vector from slot `b`'s resting spot to slot `a`'s — i.e. the
  // offset a card resting at `b` must travel to sit where `a` rests. On a grid
  // this naturally wraps: the step from a row's first slot to the previous row's
  // last carries the card up a row and across, not off the edge.
  function slotDelta(a: number, b: number): ReorderOffset {
    const pa = geometry.position(a)
    const pb = geometry.position(b)
    return { x: pa.x - pb.x, y: pa.y - pb.y }
  }

  /**
   * Extra `translate` (px) the caller should apply to the row at `index`: the
   * live pointer offset for the dragged row, a one-slot shift for rows the drag
   * has passed (opening the gap), 0 otherwise. The shift is the geometric gap to
   * the neighbouring slot, so a grid card wrapping a row edge slides correctly.
   */
  function dragOffset(index: number): ReorderOffset {
    const from = from_index.value
    const to = target_index.value
    if (from === null || to === null) return ZERO

    if (index === from) return { x: delta_x.value, y: delta_y.value }
    if (from < to && index > from && index <= to) return slotDelta(index - 1, index)
    if (to < from && index >= to && index < from) return slotDelta(index + 1, index)
    return ZERO
  }

  /**
   * Whether the row at `index` should animate its offset. The dragged row
   * tracks the pointer untransitioned (so it doesn't lag the cursor); every
   * other row transitions so the gap opens and closes smoothly as it passes.
   */
  function shouldTransition(index: number): boolean {
    if (from_index.value === null) return false
    return index !== from_index.value
  }

  function updateDelta() {
    delta_x.value = pointer_x - start_client_x + (window.scrollX - start_scroll_x)
    delta_y.value = pointer_y - start_client_y + (window.scrollY - start_scroll_y)
    updateTarget()
  }

  // Advance the target toward the drag's ideal slot, but only once it's pushed
  // past the midpoint by HYSTERESIS — and clear that margin again to reverse.
  // The while-loops absorb fast multi-slot drags; one tick per real crossing.
  function updateTarget() {
    if (from_index.value === null) return

    const last = count() - 1
    const ideal = geometry.idealIndex(from_index.value, delta_x.value, delta_y.value)
    let next = target_index.value ?? from_index.value

    while (ideal - next > 0.5 + HYSTERESIS && next < last) next++
    while (next - ideal > 0.5 + HYSTERESIS && next > 0) next--

    if (next === target_index.value) return
    if (target_index.value !== null) emitSfx('tap_05')
    target_index.value = next
  }

  // Which edge the pointer sits in: -1 top, +1 bottom, 0 neither. The top zone
  // is offset by the sticky chrome so it triggers at the visible list top.
  function edgeDirection(): number {
    if (pointer_y < (topInset?.() ?? 0) + EDGE_ZONE) return -1
    if (window.innerHeight - pointer_y < EDGE_ZONE) return 1
    return 0
  }

  // Drive page scroll while the pointer sits in an edge zone, ramping through
  // EDGE_RAMP tiers the longer the dwell lasts. Re-reads pointer position each
  // frame and folds the scroll delta into the dragged offset, so the row stays
  // under the cursor as the list moves beneath it.
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
      const target = Math.min(max_scroll_y, Math.max(0, window.scrollY + dir * tier.speed))
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

  // Once a drag is live, swallow touch-scroll so the page doesn't pan under the
  // finger — the engine drives any needed scroll via `autoScroll`. Non-passive
  // so `preventDefault` actually cancels the scroll. Only attached for the drag
  // duration, so normal touch scrolling is untouched the rest of the time.
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

    if (from !== null) emitSfx('snappy_button_5')

    // Commit and clear in the same synchronous tick: `onReorder` reorders the
    // list optimistically and `reset` zeroes the offsets, so a single render
    // shows the row in its new slot with no offset — no snap-back frame.
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

    emitSfx('generic_button_15')
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
