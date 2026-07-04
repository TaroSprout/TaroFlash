import { type CardGridSize } from '@/views/deck/composables/view-shell'
import { computed, toValue, type CSSProperties, type MaybeRefOrGetter } from 'vue'

const XL_CARD_WIDTH = 260
const XL_GAP = 8
// aspect-card is 7 / 8 (width / height), so a cell's height is its width * 8/7.
const CELL_ASPECT = 8 / 7
const CARD_SCALE: Record<CardGridSize, number> = {
  base: 0.65,
  md: 0.85,
  xl: 1
}

const GRID_CLASSES = ['grid', 'justify-center']

export type GridItemPosition = { x: number; y: number }

/**
 * Grid geometry for the deck card grid. Pure arithmetic off the discrete size
 * level — every cell is a uniform, known size, so row pitch and per-card offsets
 * need no DOM measurement and the grid can be window-virtualized by row.
 *
 * @param grid_size       - Active size level (Small / Base / Full).
 * @param container_width - Measured inner width of the scroll container, used to
 *                          derive the column count. Defaults to 0 (skeleton use,
 *                          which only needs `card_scale` / `grid_style`).
 * @param item_count      - Total cards on screen, used for row count + per-row
 *                          centering of the trailing partial row.
 */
export function useCardGrid(
  grid_size: MaybeRefOrGetter<CardGridSize>,
  container_width: MaybeRefOrGetter<number> = 0,
  item_count: MaybeRefOrGetter<number> = 0
) {
  const card_scale = computed(() => CARD_SCALE[toValue(grid_size)])
  const cell_width = computed(() => XL_CARD_WIDTH * card_scale.value)
  const gap = computed(() => XL_GAP * card_scale.value)
  const row_pitch = computed(() => cell_width.value * CELL_ASPECT + gap.value)

  const columns = computed(() => {
    const width = toValue(container_width)
    if (width <= 0) return 1
    return Math.max(1, Math.floor((width + gap.value) / (cell_width.value + gap.value)))
  })

  const row_count = computed(() => Math.ceil(toValue(item_count) / columns.value))

  // Auto-fill grid for non-virtualized callers (the skeleton).
  const grid_style = computed<CSSProperties>(() => ({
    gap: `${gap.value}px`,
    gridTemplateColumns: `repeat(auto-fill, ${cell_width.value}px)`
  }))

  /**
   * Absolute (x, y) px offset of the card at `index` within the virtual
   * viewport. The whole grid is centered on a full row's width, so every row —
   * including the trailing partial one — shares the same left edge and fills
   * left-to-right (mirrors the grid's `justify-center`). This is the seam a
   * future drag-to-reorder layer adds its live offset on top of.
   */
  function itemPosition(index: number): GridItemPosition {
    const cols = columns.value
    const row = Math.floor(index / cols)
    const col = index % cols

    const full_row_width = cols * cell_width.value + (cols - 1) * gap.value
    const offset_x = Math.max(0, (toValue(container_width) - full_row_width) / 2)

    return { x: offset_x + col * (cell_width.value + gap.value), y: row * row_pitch.value }
  }

  return {
    card_scale,
    cell_width,
    gap,
    columns,
    row_count,
    row_pitch,
    grid_style,
    grid_classes: GRID_CLASSES,
    itemPosition
  }
}
