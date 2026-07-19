import { describe, test, expect } from 'vite-plus/test'
import { ref } from 'vue'
import { useCardGrid } from '@/views/deck/card-grid/use-card-grid'

// Module-private constants:
//   XL_CARD_WIDTH = 260, XL_GAP = 8
//   CARD_SCALE: base=0.65, md=0.85, xl=1
// Derived column widths: base=260*0.65=169, md=260*0.85=221, xl=260*1=260
// Derived gaps:          base=8*0.65=5.2,   md=8*0.85=6.8,   xl=8*1=8

describe('useCardGrid', () => {
  // ── grid_style — columns ──────────────────────────────────────────────────

  test('grid_style has gridTemplateColumns repeat(auto-fill, 169px) for "base" [obligation]', () => {
    const { grid_style } = useCardGrid('base')
    expect(grid_style.value.gridTemplateColumns).toBe('repeat(auto-fill, 169px)')
  })

  test('grid_style has gridTemplateColumns repeat(auto-fill, 221px) for "md" [obligation]', () => {
    const { grid_style } = useCardGrid('md')
    expect(grid_style.value.gridTemplateColumns).toBe('repeat(auto-fill, 221px)')
  })

  test('grid_style has gridTemplateColumns repeat(auto-fill, 260px) for "xl" [obligation]', () => {
    const { grid_style } = useCardGrid('xl')
    expect(grid_style.value.gridTemplateColumns).toBe('repeat(auto-fill, 260px)')
  })

  // ── grid_style — gap scales with card_scale [obligation] ─────────────────

  test('gap is 8 * card_scale for "base" (5.2px) [obligation]', () => {
    const { grid_style } = useCardGrid('base')
    expect(grid_style.value.gap).toBe('5.2px')
  })

  test('gap is 8 * card_scale for "md" (6.8px) [obligation]', () => {
    const { grid_style } = useCardGrid('md')
    expect(grid_style.value.gap).toBe('6.8px')
  })

  test('gap is 8 * card_scale for "xl" (8px) [obligation]', () => {
    const { grid_style } = useCardGrid('xl')
    expect(grid_style.value.gap).toBe('8px')
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
    const { grid_style } = useCardGrid('md')
    expect(grid_style.value.gridTemplateColumns).toBe('repeat(auto-fill, 221px)')
  })

  test('accepts a ref and reacts to changes [obligation]', () => {
    const size = ref('base')
    const { grid_style } = useCardGrid(size)

    expect(grid_style.value.gridTemplateColumns).toBe('repeat(auto-fill, 169px)')

    size.value = 'xl'

    expect(grid_style.value.gridTemplateColumns).toBe('repeat(auto-fill, 260px)')
  })

  test('accepts a getter function and reacts to its returned value', () => {
    let size = 'base'
    const { cell_width } = useCardGrid(() => size)
    expect(cell_width.value).toBe(169)
  })

  // ── return shape ──────────────────────────────────────────────────────────

  test('returns cell_width and grid_style as computed refs', () => {
    const { cell_width, grid_style } = useCardGrid('md')
    expect(cell_width).toHaveProperty('value')
    expect(grid_style).toHaveProperty('value')
  })

  // ── columns — floor((width+gap)/(cellWidth+gap)), min 1 [obligation] ──────
  // xl: cell_width=260, gap=8

  test('columns returns 1 when container_width is 0 [obligation]', () => {
    const { columns } = useCardGrid('xl', 0, 5)
    expect(columns.value).toBe(1)
  })

  test('columns returns 1 when container_width is negative [obligation]', () => {
    const { columns } = useCardGrid('xl', -1, 5)
    expect(columns.value).toBe(1)
  })

  test('columns = max(1, floor((width+gap)/(cellWidth+gap))) [obligation]', () => {
    // xl: (800+8)/(260+8) = 808/268 ≈ 3.01 → floor=3 → max(1,3)=3
    const { columns } = useCardGrid('xl', 800, 0)
    expect(columns.value).toBe(3)
  })

  test('columns fits exactly three xl cards when width is exactly 3*cell+2*gap', () => {
    // 3*260 + 2*8 = 796 → (796+8)/(260+8) = 804/268 = 3 exactly
    const { columns } = useCardGrid('xl', 796, 0)
    expect(columns.value).toBe(3)
  })

  test('columns reacts when container_width ref changes [obligation]', () => {
    const width = ref(800)
    const { columns } = useCardGrid('xl', width, 0)
    expect(columns.value).toBe(3)
    width.value = 0
    expect(columns.value).toBe(1)
  })

  // ── row_count = ceil(count / columns) [obligation] ────────────────────────

  test('row_count = ceil(item_count / columns) [obligation]', () => {
    // xl, width=800 → columns=3; ceil(5/3)=2
    const { row_count } = useCardGrid('xl', 800, 5)
    expect(row_count.value).toBe(2)
  })

  test('row_count is 0 when item_count is 0', () => {
    const { row_count } = useCardGrid('xl', 800, 0)
    expect(row_count.value).toBe(0)
  })

  test('row_count is 1 for a count that fits in one row', () => {
    // xl, width=800 → columns=3; count=2 → ceil(2/3)=1
    const { row_count } = useCardGrid('xl', 800, 2)
    expect(row_count.value).toBe(1)
  })

  // ── row_pitch = cell_width*(8/7)+gap [obligation] ─────────────────────────

  test('row_pitch equals cell_width*(8/7)+gap [obligation]', () => {
    const { cell_width, gap, row_pitch } = useCardGrid('md')
    expect(row_pitch.value).toBeCloseTo(cell_width.value * (8 / 7) + gap.value, 10)
  })

  test('row_pitch for xl ≈ 305.14 (260*8/7+8) [obligation]', () => {
    const { row_pitch } = useCardGrid('xl')
    // 260*(8/7)+8 = 297.143…+8 = 305.143…
    expect(row_pitch.value).toBeCloseTo(305.143, 2)
  })

  // ── itemPosition — left-justified, partial rows share full-row offset [obligation]

  test('itemPosition(0) has x = centering offset and y = 0 [obligation]', () => {
    // xl, width=1000 → columns=3, full_row_width=3*260+2*8=796, offset_x=(1000-796)/2=102
    const { itemPosition } = useCardGrid('xl', 1000, 5)
    const p = itemPosition(0)
    expect(p.x).toBeCloseTo(102)
    expect(p.y).toBeCloseTo(0)
  })

  test('itemPosition: partial last row is left-justified with the same left edge as full rows [obligation]', () => {
    // xl, width=1000 → columns=3; count=5 → row 0: [0,1,2], row 1 (partial): [3,4]
    // full_row_width=796, offset_x=102 for ALL rows including the partial one
    const { itemPosition } = useCardGrid('xl', 1000, 5)

    const p_full_first = itemPosition(0) // row 0, col 0 → x=102
    const p_partial_first = itemPosition(3) // row 1, col 0 → x=102 (NOT self-centered)
    expect(p_partial_first.x).toBeCloseTo(p_full_first.x)

    // Second item in partial row aligns with second item in full row
    const p_full_second = itemPosition(1) // x = 102 + (260+8) = 370
    const p_partial_second = itemPosition(4) // x = 102 + (260+8) = 370
    expect(p_partial_second.x).toBeCloseTo(p_full_second.x)
  })

  test('itemPosition y increases by row_pitch for each successive row [obligation]', () => {
    const { itemPosition, row_pitch } = useCardGrid('xl', 1000, 6)
    const row0 = itemPosition(0).y
    const row1 = itemPosition(3).y // first item of next row (columns=3)
    expect(row1 - row0).toBeCloseTo(row_pitch.value)
  })
})
