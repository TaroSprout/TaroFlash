import { describe, test, expect } from 'vite-plus/test'
import { ref } from 'vue'
import { useCardGrid } from '@/views/deck/card-grid/use-card-grid'

// Module-private constants:
//   XL_CARD_WIDTH = 314, XL_GAP = 16
//   CARD_SCALE: base=0.56, md=0.75, xl=1
// Derived column widths: base=314*0.56=175.84, md=314*0.75=235.5, xl=314*1=314
// Derived gaps:          base=16*0.56=8.96,    md=16*0.75=12,      xl=16*1=16

describe('useCardGrid', () => {
  // ── card_scale ────────────────────────────────────────────────────────────

  test('card_scale is 0.56 for grid_size="base" [obligation]', () => {
    const { card_scale } = useCardGrid('base')
    expect(card_scale.value).toBe(0.56)
  })

  test('card_scale is 0.75 for grid_size="md" [obligation]', () => {
    const { card_scale } = useCardGrid('md')
    expect(card_scale.value).toBe(0.75)
  })

  test('card_scale is 1 for grid_size="xl" [obligation]', () => {
    const { card_scale } = useCardGrid('xl')
    expect(card_scale.value).toBe(1)
  })

  // ── grid_style — columns ──────────────────────────────────────────────────

  test('grid_style has gridTemplateColumns repeat(auto-fill, 175.84px) for "base" [obligation]', () => {
    const { grid_style } = useCardGrid('base')
    expect(grid_style.value.gridTemplateColumns).toBe('repeat(auto-fill, 175.84px)')
  })

  test('grid_style has gridTemplateColumns repeat(auto-fill, 235.5px) for "md" [obligation]', () => {
    const { grid_style } = useCardGrid('md')
    expect(grid_style.value.gridTemplateColumns).toBe('repeat(auto-fill, 235.5px)')
  })

  test('grid_style has gridTemplateColumns repeat(auto-fill, 314px) for "xl" [obligation]', () => {
    const { grid_style } = useCardGrid('xl')
    expect(grid_style.value.gridTemplateColumns).toBe('repeat(auto-fill, 314px)')
  })

  // ── grid_style — gap scales with card_scale [obligation] ─────────────────

  test('gap is 16 * card_scale for "base" (8.96px) [obligation]', () => {
    const { grid_style } = useCardGrid('base')
    expect(grid_style.value.gap).toBe('8.96px')
  })

  test('gap is 16 * card_scale for "md" (12px) [obligation]', () => {
    const { grid_style } = useCardGrid('md')
    expect(grid_style.value.gap).toBe('12px')
  })

  test('gap is 16 * card_scale for "xl" (16px) [obligation]', () => {
    const { grid_style } = useCardGrid('xl')
    expect(grid_style.value.gap).toBe('16px')
  })

  // ── grid_classes — static constant ────────────────────────────────────────

  test('grid_classes is the static array [grid, justify-center] [obligation]', () => {
    const { grid_classes } = useCardGrid('md')
    expect(grid_classes).toEqual(['grid', 'justify-center'])
  })

  test('grid_classes is the same reference across calls (module constant) [obligation]', () => {
    const { grid_classes: a } = useCardGrid('base')
    const { grid_classes: b } = useCardGrid('xl')
    expect(a).toBe(b)
  })

  // ── reactivity — accepts a MaybeRefOrGetter ───────────────────────────────

  test('accepts a plain string value (not a ref)', () => {
    const { card_scale, grid_style } = useCardGrid('md')
    expect(card_scale.value).toBe(0.75)
    expect(grid_style.value.gridTemplateColumns).toBe('repeat(auto-fill, 235.5px)')
  })

  test('accepts a ref and reacts to changes [obligation]', () => {
    const size = ref('base')
    const { card_scale, grid_style } = useCardGrid(size)

    expect(card_scale.value).toBe(0.56)
    expect(grid_style.value.gridTemplateColumns).toBe('repeat(auto-fill, 175.84px)')

    size.value = 'xl'

    expect(card_scale.value).toBe(1)
    expect(grid_style.value.gridTemplateColumns).toBe('repeat(auto-fill, 314px)')
  })

  test('accepts a getter function and reacts to its returned value', () => {
    let size = 'base'
    const { card_scale } = useCardGrid(() => size)
    expect(card_scale.value).toBe(0.56)
  })

  // ── return shape ──────────────────────────────────────────────────────────

  test('returns card_scale and grid_style as computed refs', () => {
    const { card_scale, grid_style } = useCardGrid('md')
    expect(card_scale).toHaveProperty('value')
    expect(grid_style).toHaveProperty('value')
  })

  // ── columns — floor((width+gap)/(cellWidth+gap)), min 1 [obligation] ──────
  // xl: cell_width=314, gap=16

  test('columns returns 1 when container_width is 0 [obligation]', () => {
    const { columns } = useCardGrid('xl', 0, 5)
    expect(columns.value).toBe(1)
  })

  test('columns returns 1 when container_width is negative [obligation]', () => {
    const { columns } = useCardGrid('xl', -1, 5)
    expect(columns.value).toBe(1)
  })

  test('columns = max(1, floor((width+gap)/(cellWidth+gap))) [obligation]', () => {
    // xl: (800+16)/(314+16) = 816/330 ≈ 2.47 → floor=2 → max(1,2)=2
    const { columns } = useCardGrid('xl', 800, 0)
    expect(columns.value).toBe(2)
  })

  test('columns fits exactly three xl cards when width is exactly 3*cell+2*gap', () => {
    // 3*314 + 2*16 = 974 → (974+16)/(314+16) = 990/330 = 3 exactly
    const { columns } = useCardGrid('xl', 974, 0)
    expect(columns.value).toBe(3)
  })

  test('columns reacts when container_width ref changes [obligation]', () => {
    const width = ref(800)
    const { columns } = useCardGrid('xl', width, 0)
    expect(columns.value).toBe(2)
    width.value = 0
    expect(columns.value).toBe(1)
  })

  // ── row_count = ceil(count / columns) [obligation] ────────────────────────

  test('row_count = ceil(item_count / columns) [obligation]', () => {
    // xl, width=800 → columns=2; ceil(5/2)=3
    const { row_count } = useCardGrid('xl', 800, 5)
    expect(row_count.value).toBe(3)
  })

  test('row_count is 0 when item_count is 0', () => {
    const { row_count } = useCardGrid('xl', 800, 0)
    expect(row_count.value).toBe(0)
  })

  test('row_count is 1 for a count that fits in one row', () => {
    // xl, width=800 → columns=2; count=2 → ceil(2/2)=1
    const { row_count } = useCardGrid('xl', 800, 2)
    expect(row_count.value).toBe(1)
  })

  // ── row_pitch = cell_width*(8/7)+gap [obligation] ─────────────────────────

  test('row_pitch equals cell_width*(8/7)+gap [obligation]', () => {
    const { cell_width, gap, row_pitch } = useCardGrid('md')
    expect(row_pitch.value).toBeCloseTo(cell_width.value * (8 / 7) + gap.value, 10)
  })

  test('row_pitch for xl ≈ 374.86 (314*8/7+16) [obligation]', () => {
    const { row_pitch } = useCardGrid('xl')
    // 314*(8/7)+16 = 358.857…+16 = 374.857…
    expect(row_pitch.value).toBeCloseTo(374.857, 2)
  })

  // ── itemPosition — left-justified, partial rows share full-row offset [obligation]

  test('itemPosition(0) has x = centering offset and y = 0 [obligation]', () => {
    // xl, width=1000 → columns=3, full_row_width=3*314+2*16=974, offset_x=(1000-974)/2=13
    const { itemPosition } = useCardGrid('xl', 1000, 5)
    const p = itemPosition(0)
    expect(p.x).toBeCloseTo(13)
    expect(p.y).toBeCloseTo(0)
  })

  test('itemPosition: partial last row is left-justified with the same left edge as full rows [obligation]', () => {
    // xl, width=1000 → columns=3; count=5 → row 0: [0,1,2], row 1 (partial): [3,4]
    // full_row_width=974, offset_x=13 for ALL rows including the partial one
    const { itemPosition } = useCardGrid('xl', 1000, 5)

    const p_full_first = itemPosition(0) // row 0, col 0 → x=13
    const p_partial_first = itemPosition(3) // row 1, col 0 → x=13 (NOT self-centered)
    expect(p_partial_first.x).toBeCloseTo(p_full_first.x)

    // Second item in partial row aligns with second item in full row
    const p_full_second = itemPosition(1) // x = 13 + (314+16) = 343
    const p_partial_second = itemPosition(4) // x = 13 + (314+16) = 343
    expect(p_partial_second.x).toBeCloseTo(p_full_second.x)
  })

  test('itemPosition y increases by row_pitch for each successive row [obligation]', () => {
    const { itemPosition, row_pitch } = useCardGrid('xl', 1000, 6)
    const row0 = itemPosition(0).y
    const row1 = itemPosition(3).y // first item of next row (columns=3)
    expect(row1 - row0).toBeCloseTo(row_pitch.value)
  })
})
