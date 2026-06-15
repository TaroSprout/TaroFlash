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
})
