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

export type ReorderDragOptions = {
  // Fixed row pitch in px — the vertical distance between adjacent rows. The
  // engine is geometry-light because the list is uniform: target slot and gap
  // offsets are pure arithmetic off this pitch, no per-row measurement.
  pitch: number
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
}

export type ReorderDrag = ReturnType<typeof useReorderDrag>

/**
 * Pointer-driven drag-to-reorder engine for a fixed-pitch vertical list.
 *
 * Designed to coexist with a virtualizer: it never moves or clones DOM. The
 * caller renders rows as usual and applies `dragOffset(index)` as an extra
 * `translateY` on each row. The dragged row follows the pointer 1:1; the rows
 * it passes shift by one pitch to open a gap. The caller is responsible for
 * keeping the dragged row mounted (e.g. via the virtualizer's `rangeExtractor`)
 * so it survives auto-scroll out of the overscan window.
 *
 * Lifecycle: bind `start(index, event)` to a handle's `pointerdown`. The engine
 * attaches window-level move/up listeners for the drag duration and tears them
 * down on drop, cancel, or unmount.
 *
 * @example
 * const reorder = useReorderDrag({
 *   pitch: ROW_PITCH,
 *   count: () => all_cards.value.length,
 *   enabled: () => is_above_md.value,
 *   onReorder: (from, to) => editor.reorderCard(from, to)
 * })
 */
export function useReorderDrag({ pitch, count, enabled, topInset, onReorder }: ReorderDragOptions) {
  const from_index = ref<number | null>(null)
  const delta = ref(0)

  let start_client_y = 0
  let start_scroll_y = 0
  let pointer_y = 0
  let raf = 0

  // Direction of the current continuous edge dwell (-1 up / +1 down / 0 none)
  // and the rAF timestamp it began at, used to ramp the scroll speed.
  let edge_dir = 0
  let edge_since = 0

  // Live drop slot. Stateful (not a pure round) so it can carry hysteresis:
  // updated by `updateTarget` as the drag translate changes.
  const target_index = ref<number | null>(null)

  /**
   * Extra `translateY` (px) the caller should apply to the row at `index`:
   * the live pointer offset for the dragged row, ±pitch for rows the drag has
   * passed (opening the gap), 0 otherwise.
   */
  function dragOffset(index: number): number {
    const from = from_index.value
    const to = target_index.value
    if (from === null || to === null) return 0

    if (index === from) return delta.value
    if (from < to && index > from && index <= to) return -pitch
    if (to < from && index >= to && index < from) return pitch
    return 0
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
    delta.value = pointer_y - start_client_y + (window.scrollY - start_scroll_y)
    updateTarget()
  }

  // Advance the target toward the drag's ideal slot, but only once it's pushed
  // past the midpoint by HYSTERESIS — and clear that margin again to reverse.
  // The while-loops absorb fast multi-slot drags; one tick per real crossing.
  function updateTarget() {
    if (from_index.value === null) return

    const last = count() - 1
    const ideal = from_index.value + delta.value / pitch
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
      window.scrollBy(0, dir * tier.speed)
      updateDelta()
      raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
  }

  function onMove(event: PointerEvent) {
    pointer_y = event.clientY
    updateDelta()
    autoScroll()
  }

  function stopTracking() {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    document.body.style.userSelect = ''
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onEnd)
    window.removeEventListener('pointercancel', onEnd)
  }

  function reset() {
    from_index.value = null
    target_index.value = null
    delta.value = 0
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
    start_client_y = event.clientY
    start_scroll_y = window.scrollY
    pointer_y = event.clientY
    delta.value = 0
    edge_dir = 0

    emitSfx('generic_button_15')
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onEnd)
    window.addEventListener('pointercancel', onEnd)
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
