import { describe, test, expect } from 'vite-plus/test'
import { ref } from 'vue'
import { useCardGrid } from '@/views/deck/card-grid/use-card-grid'

// XL_CARD_WIDTH = 314 (module-private constant)
// Expected column widths: base=314*0.6=188.4, md=314*0.75=235.5, xl=314*1=314

describe('useCardGrid', () => {
  // ── card_scale ────────────────────────────────────────────────────────────

  test('card_scale is 0.6 for grid_size="base" [obligation]', () => {
    const { card_scale } = useCardGrid('base')
    expect(card_scale.value).toBe(0.6)
  })

  test('card_scale is 0.75 for grid_size="md" [obligation]', () => {
    const { card_scale } = useCardGrid('md')
    expect(card_scale.value).toBe(0.75)
  })

  test('card_scale is 1 for grid_size="xl" [obligation]', () => {
    const { card_scale } = useCardGrid('xl')
    expect(card_scale.value).toBe(1)
  })

  // ── grid_style ────────────────────────────────────────────────────────────

  test('grid_style has gridTemplateColumns repeat(auto-fill, 188.4px) for "base" [obligation]', () => {
    const { grid_style } = useCardGrid('base')
    expect(grid_style.value.gridTemplateColumns).toBe('repeat(auto-fill, 188.4px)')
  })

  test('grid_style has gridTemplateColumns repeat(auto-fill, 235.5px) for "md" [obligation]', () => {
    const { grid_style } = useCardGrid('md')
    expect(grid_style.value.gridTemplateColumns).toBe('repeat(auto-fill, 235.5px)')
  })

  test('grid_style has gridTemplateColumns repeat(auto-fill, 314px) for "xl" [obligation]', () => {
    const { grid_style } = useCardGrid('xl')
    expect(grid_style.value.gridTemplateColumns).toBe('repeat(auto-fill, 314px)')
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

    expect(card_scale.value).toBe(0.6)
    expect(grid_style.value.gridTemplateColumns).toBe('repeat(auto-fill, 188.4px)')

    size.value = 'xl'

    expect(card_scale.value).toBe(1)
    expect(grid_style.value.gridTemplateColumns).toBe('repeat(auto-fill, 314px)')
  })

  test('accepts a getter function and reacts to its returned value', () => {
    let size = 'base'
    const { card_scale } = useCardGrid(() => size)
    expect(card_scale.value).toBe(0.6)
  })

  // ── return shape ──────────────────────────────────────────────────────────

  test('returns card_scale and grid_style as computed refs', () => {
    const { card_scale, grid_style } = useCardGrid('md')
    // Computed refs have a .value property
    expect(card_scale).toHaveProperty('value')
    expect(grid_style).toHaveProperty('value')
  })
})
