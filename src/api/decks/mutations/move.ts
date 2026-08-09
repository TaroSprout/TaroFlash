import { useMutation, useQueryCache } from '@pinia/colada'
import { moveDeck, type MoveDeckParams } from '../db'

type QueryCache = ReturnType<typeof useQueryCache>
type ReorderContext = Deck[] | undefined

/** Fractional rank sitting between `before` and `after`, open-ended at either end. */
function interpolateRank(before: number | undefined, after: number | undefined): number {
  if (before != null && after != null) return (before + after) / 2
  if (before != null) return before + 1000
  if (after != null) return after - 1000
  return 0
}

/**
 * Settles a dragged deck beside its anchor immediately, so it doesn't snap
 * back while the server catches up. Returns the order to undo back to.
 *
 * Only the moved deck's position is rewritten — the loaded list isn't held in
 * display order, so moving it within that array would place it wrongly.
 */
function reorderDeckCache(
  queryCache: QueryCache,
  { deck_id, anchor_id, side }: MoveDeckParams
): ReorderContext {
  const snapshot = queryCache.getQueryData(['decks']) as ReorderContext
  if (!snapshot) return undefined

  const sorted = [...snapshot].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
  const without = sorted.filter((d) => d.id !== deck_id)
  const anchor_index = without.findIndex((d) => d.id === anchor_id)
  if (anchor_index === -1) return snapshot

  const insert_at = side === 'after' ? anchor_index + 1 : anchor_index
  const rank = interpolateRank(without[insert_at - 1]?.rank, without[insert_at]?.rank)

  queryCache.setQueryData(
    ['decks'],
    snapshot.map((d) => (d.id === deck_id ? { ...d, rank } : d))
  )

  return snapshot
}

/** Moves a single deck on the dashboard, to either side of another one. */
export function useMoveDeckMutation() {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (params: MoveDeckParams) => moveDeck(params),
    onMutate: (vars: MoveDeckParams) => ({
      snapshot: reorderDeckCache(queryCache, vars)
    }),
    onError: (_error, _vars, { snapshot }) => {
      if (snapshot) queryCache.setQueryData(['decks'], snapshot)
    },
    onSettled: () => {
      queryCache.invalidateQueries({ key: ['decks'] })
    }
  })
}
