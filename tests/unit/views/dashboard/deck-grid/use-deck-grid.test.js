import { describe, test, expect } from 'vite-plus/test'
import { ref } from 'vue'
import { useDeckGrid } from '@/views/dashboard/deck-grid/use-deck-grid'

describe('useDeckGrid — cell_width', () => {
  test('uses the base cell width for size="base"', () => {
    const { cell_width } = useDeckGrid('base')
    expect(cell_width.value).toBe(192)
  })

  test('uses the sm cell width for size="sm"', () => {
    const { cell_width } = useDeckGrid('sm')
    expect(cell_width.value).toBe(172)
  })

  test('reacts to a size ref changing', () => {
    const size = ref('base')
    const { cell_width } = useDeckGrid(size)
    expect(cell_width.value).toBe(192)
    size.value = 'sm'
    expect(cell_width.value).toBe(172)
  })
})

describe('useDeckGrid — columns', () => {
  test('falls back to a single column when container_width is 0', () => {
    const { columns } = useDeckGrid('base', 0)
    expect(columns.value).toBe(1)
  })

  test('fits as many columns as the container width allows, gap-inclusive', () => {
    // cell_width=192, gap_x=12 → each slot costs 204px
    const { columns } = useDeckGrid('base', 620)
    expect(columns.value).toBe(3)
  })

  test('reacts to a container_width ref changing', () => {
    const width = ref(0)
    const { columns } = useDeckGrid('base', width)
    expect(columns.value).toBe(1)
    width.value = 620
    expect(columns.value).toBe(3)
  })
})

describe('useDeckGrid — row_count', () => {
  test('computes the number of rows needed for item_count at the current column count', () => {
    const { row_count } = useDeckGrid('base', 620, 7)
    // 3 columns → ceil(7/3) = 3 rows
    expect(row_count.value).toBe(3)
  })

  test('is 0 rows for 0 items', () => {
    const { row_count } = useDeckGrid('base', 620, 0)
    expect(row_count.value).toBe(0)
  })
})

describe('useDeckGrid — itemPosition', () => {
  test('places index 0 at the origin', () => {
    const { itemPosition } = useDeckGrid('base', 620)
    expect(itemPosition(0)).toEqual({ x: 0, y: 0 })
  })

  test('advances x by cell_width + gap_x within a row', () => {
    const { itemPosition, cell_width, gap_x } = useDeckGrid('base', 620)
    expect(itemPosition(1)).toEqual({ x: cell_width.value + gap_x, y: 0 })
  })

  test('wraps to the next row (y advances by row_pitch, x resets) once columns fill', () => {
    // 3 columns fit at width=620, so index 3 is the first item of row 2
    const { itemPosition, row_pitch } = useDeckGrid('base', 620)
    expect(itemPosition(3)).toEqual({ x: 0, y: row_pitch.value })
  })
})

describe('useDeckGrid — row_pitch', () => {
  test('derives row_pitch from cell_width * aspect + gap_y, distinct per size', () => {
    const base = useDeckGrid('base')
    const sm = useDeckGrid('sm')
    expect(base.row_pitch.value).not.toBe(sm.row_pitch.value)
  })
})
