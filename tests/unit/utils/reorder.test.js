import { describe, test, expect } from 'vite-plus/test'
import { resolveReorderAnchor } from '@/utils/reorder'

// Minimal plain row for resolveReorderAnchor — only needs id
function c(id) {
  return { id }
}

describe('resolveReorderAnchor', () => {
  // [obligation] dropping after 2nd row resolves to { anchor_id: that row, side: 'after' }
  test('dropping after the 2nd row (to=2) picks the row before as after-anchor [obligation]', () => {
    const without = [c(1), c(2), c(3)]
    expect(resolveReorderAnchor(without, 2)).toEqual({ anchor_id: 2, side: 'after' })
  })

  // [obligation] dropping at top (to=0) resolves to nearest right row with side='before'
  test('dropping at top (to=0) walks right and picks the first row as before-anchor [obligation]', () => {
    const without = [c(1), c(2)]
    expect(resolveReorderAnchor(without, 0)).toEqual({ anchor_id: 1, side: 'before' })
  })

  // [obligation] skips temp rows (id<=0) when walking outward
  test('skips temp rows (id <= 0) and walks to the nearest persisted neighbour [obligation]', () => {
    // Drop at slot 1: walking left hits a temp at idx 0, no valid left neighbour,
    // so walks right from slot 1 and picks id=3.
    const without = [c(-1), c(3)]
    expect(resolveReorderAnchor(without, 1)).toEqual({ anchor_id: 3, side: 'before' })
  })

  test('skips temp on the left and finds a persisted row further left', () => {
    // Drop at slot 2: idx 0=persisted(1), idx 1=temp(-2), so walk left skips -2 then picks 1.
    const without = [c(1), c(-2), c(5)]
    expect(resolveReorderAnchor(without, 2)).toEqual({ anchor_id: 1, side: 'after' })
  })

  // [obligation] returns null when no persisted neighbour exists
  test('returns null when no persisted neighbour exists (all temps or empty list) [obligation]', () => {
    expect(resolveReorderAnchor([], 0)).toBeNull()
    expect(resolveReorderAnchor([c(-1), c(-2)], 0)).toBeNull()
  })

  test('returns null when the only persisted row was the dragged one (single-row list)', () => {
    // without=[] because the single row is removed before calling this fn
    expect(resolveReorderAnchor([], 0)).toBeNull()
  })

  test('walking left from to takes the immediate left neighbour when it is persisted', () => {
    const without = [c(10), c(20), c(30)]
    expect(resolveReorderAnchor(without, 3)).toEqual({ anchor_id: 30, side: 'after' })
  })

  test('falls back to right walk when left has only temps', () => {
    // to=2: left candidates are idx 0 (temp) and idx 1 (temp); right candidate is idx 2 (persisted)
    const without = [c(0), c(-5), c(7)]
    expect(resolveReorderAnchor(without, 2)).toEqual({ anchor_id: 7, side: 'before' })
  })

  // [obligation] deck-reorder caller: dropping at the very first index
  test('dropping at the very first index (to=0) of a multi-row list [obligation]', () => {
    const without = [c(100), c(200), c(300)]
    expect(resolveReorderAnchor(without, 0)).toEqual({ anchor_id: 100, side: 'before' })
  })

  // [obligation] deck-reorder caller: dropping at the very last index
  test('dropping at the very last index (to=length) of a multi-row list [obligation]', () => {
    const without = [c(100), c(200), c(300)]
    expect(resolveReorderAnchor(without, without.length)).toEqual({
      anchor_id: 300,
      side: 'after'
    })
  })

  // [obligation] an anchor row missing an id resolves to a no-op/null, not a throw
  test('a row with a missing id is treated as unresolvable and skipped without throwing [obligation]', () => {
    const without = [{}, {}]
    expect(() => resolveReorderAnchor(without, 1)).not.toThrow()
    expect(resolveReorderAnchor(without, 1)).toBeNull()
  })
})
