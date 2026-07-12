import { useMutation, useQueryCache } from '@pinia/colada'
import { moveDeck, type MoveDeckParams } from '../db'

type QueryCache = ReturnType<typeof useQueryCache>
type ReorderContext = Deck[] | undefined

/**
 * Optimistically move `deck_id` to sit `side` of `anchor_id` within the
 * cached deck list, in place of waiting for the refetch. Returns the pre-move
 * snapshot for rollback, or `undefined` when the list isn't cached.
 */
function reorderDeckCache(
  queryCache: QueryCache,
  { deck_id, anchor_id, side }: MoveDeckParams
): ReorderContext {
  const snapshot = queryCache.getQueryData(['decks']) as ReorderContext
  if (!snapshot) return undefined

  const decks = [...snapshot]
  const from_index = decks.findIndex((d) => d.id === deck_id)
  if (from_index === -1) return snapshot

  const [moved] = decks.splice(from_index, 1)
  const anchor_index = decks.findIndex((d) => d.id === anchor_id)
  if (anchor_index === -1) return snapshot

  decks.splice(side === 'after' ? anchor_index + 1 : anchor_index, 0, moved)
  queryCache.setQueryData(['decks'], decks)

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
