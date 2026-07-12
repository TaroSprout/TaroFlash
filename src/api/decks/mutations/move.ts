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
 * Optimistically move `deck_id` to sit `side` of `anchor_id` within the
 * cached deck list, in place of waiting for the refetch. Returns the pre-move
 * snapshot for rollback, or `undefined` when the list isn't cached.
 *
 * The dashboard displays decks sorted by `rank`, but the cache array itself
 * isn't in rank order (the fetching RPC has no `ORDER BY rank`) — so instead
 * of splicing the raw array, find `anchor_id`'s neighbour in a rank-sorted
 * view and patch only the moved deck's `rank`. The render-order sort then
 * places it correctly on its own.
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

/**
 * Reposition a single deck within the dashboard, relative to an anchor deck.
 *
 * `onMutate` optimistically reorders the cached list synchronously, so the
 * drag-reorder UI can settle the dropped card immediately. `onError` restores
 * the pre-move snapshot; `onSettled` invalidates to reconcile with the
 * server-authoritative ranks.
 */
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
