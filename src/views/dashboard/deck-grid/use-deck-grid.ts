import { computed, toValue, type MaybeRefOrGetter } from 'vue'

// Fixed per-breakpoint cell widths (the fluid card fills the cell) + --aspect-card.
const CELL_WIDTH: Record<'base' | 'sm', number> = { base: 192, sm: 172 }
const CELL_ASPECT = 8 / 7
const GAP_X = 12 // gap-x-3
const GAP_Y = 32 // gap-y-8

export type DeckGridItemPosition = { x: number; y: number }

/**
 * Left-aligned wrap geometry for the dashboard deck grid — expresses the
 * `flex-wrap` layout as absolute offsets so a drag can read/animate a card's
 * resting slot without measuring the DOM. Card width is fixed per breakpoint;
 * only `container_width` (how many fit per row) needs a live measurement.
 */
export function useDeckGrid(
  size: MaybeRefOrGetter<'base' | 'sm'>,
  container_width: MaybeRefOrGetter<number> = 0,
  item_count: MaybeRefOrGetter<number> = 0
) {
  const cell_width = computed(() => CELL_WIDTH[toValue(size)])
  const row_pitch = computed(() => cell_width.value * CELL_ASPECT + GAP_Y)

  const columns = computed(() => {
    const width = toValue(container_width)
    if (width <= 0) return 1
    return Math.max(1, Math.floor((width + GAP_X) / (cell_width.value + GAP_X)))
  })

  const row_count = computed(() => Math.ceil(toValue(item_count) / columns.value))

  function itemPosition(index: number): DeckGridItemPosition {
    const cols = columns.value
    const row = Math.floor(index / cols)
    const col = index % cols
    return { x: col * (cell_width.value + GAP_X), y: row * row_pitch.value }
  }

  return { cell_width, gap_x: GAP_X, columns, row_count, row_pitch, itemPosition }
}
