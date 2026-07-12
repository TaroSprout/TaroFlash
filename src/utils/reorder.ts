export type ReorderAnchor = { anchor_id: number; side: 'before' | 'after' }

/**
 * Resolve a fractional-rank anchor for a drag-reorder. `without` is the
 * rendered list with the dragged row already removed; `to` is the array index
 * the dragged row should land at. Picks the nearest *persisted* neighbour to
 * anchor against — temps (negative placeholder ids) can't anchor a server move.
 *
 * Walks left from the drop slot for a row to land `after`; if none (dropping
 * at the very top, or only temps to the left) walks right for a row to land
 * `before`. Returns `null` when no persisted neighbour exists — e.g. the list
 * holds a single persisted row, so there is nothing to reorder against.
 */
export function resolveReorderAnchor(without: { id?: number }[], to: number): ReorderAnchor | null {
  for (let i = to - 1; i >= 0; i--) {
    const id = without[i]?.id
    if (id !== undefined && id > 0) return { anchor_id: id, side: 'after' }
  }

  for (let i = to; i < without.length; i++) {
    const id = without[i]?.id
    if (id !== undefined && id > 0) return { anchor_id: id, side: 'before' }
  }

  return null
}
