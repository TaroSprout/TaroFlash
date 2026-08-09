export type ReorderAnchor = { anchor_id: number; side: 'before' | 'after' }

/**
 * Finds the saved row a dropped row should be placed against.
 *
 * Skips rows that haven't been saved yet — the server can't position anything
 * relative to a card it doesn't know about. `null` when nothing saved sits on
 * either side, which means there's nothing to reorder against at all.
 *
 * @param without - The list as rendered, with the dragged row taken out.
 * @param to - Where in that list it was dropped.
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
