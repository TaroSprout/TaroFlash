import { computed, onBeforeUnmount, ref } from 'vue'

// Auto-scroll kicks in when the pointer is within this many px of a viewport
// edge, advancing the page so a row can be dragged past the visible window.
const EDGE_ZONE = 90
const EDGE_SPEED = 16

export type ReorderDragOptions = {
  // Fixed row pitch in px — the vertical distance between adjacent rows. The
  // engine is geometry-light because the list is uniform: target slot and gap
  // offsets are pure arithmetic off this pitch, no per-row measurement.
  pitch: number
  count: () => number
  enabled: () => boolean
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
export function useReorderDrag({ pitch, count, enabled, onReorder }: ReorderDragOptions) {
  const from_index = ref<number | null>(null)
  const delta = ref(0)

  let start_client_y = 0
  let start_scroll_y = 0
  let pointer_y = 0
  let raf = 0

  // Round the live translate to a slot offset and clamp into list bounds.
  const target_index = computed(() => {
    if (from_index.value === null) return null
    const raw = from_index.value + Math.round(delta.value / pitch)
    return Math.max(0, Math.min(count() - 1, raw))
  })

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
  }

  function edgeSpeed(): number {
    if (pointer_y < EDGE_ZONE) return -EDGE_SPEED
    if (window.innerHeight - pointer_y < EDGE_ZONE) return EDGE_SPEED
    return 0
  }

  // Drive page scroll while the pointer sits in an edge zone. Re-reads pointer
  // position each frame and folds the scroll delta into the dragged offset, so
  // the row stays under the cursor as the list moves beneath it.
  function autoScroll() {
    if (raf) return

    const step = () => {
      const speed = edgeSpeed()
      if (speed === 0 || from_index.value === null) {
        raf = 0
        return
      }

      window.scrollBy(0, speed)
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
    delta.value = 0
  }

  function onEnd() {
    const from = from_index.value
    const to = target_index.value

    stopTracking()

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
    start_client_y = event.clientY
    start_scroll_y = window.scrollY
    pointer_y = event.clientY
    delta.value = 0

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
