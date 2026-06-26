import { setInfiniteQueryData, useMutation, useQueryCache } from '@pinia/colada'
import { moveCard, type MoveCardParams } from '../db'
import { cardsInDeckQueryKey } from '../queries/cards-page'
import { invalidateDeck } from './_invalidate'

type QueryCache = ReturnType<typeof useQueryCache>

export type UseMoveCardMutationParams = MoveCardParams & {
  deck_id: number
}

type ReorderContext = { pages: Card[][]; pageParams: unknown[] } | undefined

/** Split a flat card list back into pages of the given lengths. */
function chunkBySizes(flat: Card[], sizes: number[]): Card[][] {
  const pages: Card[][] = []
  let offset = 0

  for (const size of sizes) {
    pages.push(flat.slice(offset, offset + size))
    offset += size
  }

  return pages
}

/**
 * Optimistically move `card_id` to sit `side` of `anchor_id` within the deck's
 * cached pages, in place of waiting for the refetch. Keeps the rendered order
 * in lockstep with the drop so the row doesn't snap back between drop and the
 * server round-trip. Returns the pre-move snapshot for rollback, or `undefined`
 * when the deck isn't cached (nothing to reorder).
 */
function reorderCardInDeckCache(
  queryCache: QueryCache,
  { deck_id, card_id, anchor_id, side }: UseMoveCardMutationParams
): ReorderContext {
  const key = cardsInDeckQueryKey(deck_id)
  const snapshot = queryCache.getQueryData(key) as ReorderContext
  if (!snapshot) return undefined

  setInfiniteQueryData<Card[]>(queryCache, key, (old) => {
    const pages = old?.pages ?? []
    const sizes = pages.map((page) => page.length)
    const flat = pages.flat()

    const from_index = flat.findIndex((c) => c.id === card_id)
    if (from_index === -1) return { pages, pageParams: old?.pageParams ?? [] }

    const [moved] = flat.splice(from_index, 1)
    const anchor_index = flat.findIndex((c) => c.id === anchor_id)
    if (anchor_index === -1) return { pages, pageParams: old?.pageParams ?? [] }

    flat.splice(side === 'after' ? anchor_index + 1 : anchor_index, 0, moved)

    return { pages: chunkBySizes(flat, sizes), pageParams: old?.pageParams ?? [] }
  })

  return snapshot
}

/**
 * Reposition a single card within its deck, relative to an anchor card.
 *
 * `onMutate` optimistically reorders the cached pages synchronously, so the
 * drag-reorder UI can settle the dropped row immediately. `onError` restores
 * the pre-move snapshot; `onSettled` invalidates the deck to reconcile with the
 * server-authoritative ranks.
 */
export function useMoveCardMutation() {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: ({ deck_id: _deck_id, ...params }: UseMoveCardMutationParams) => moveCard(params),
    onMutate: (vars: UseMoveCardMutationParams) => ({
      snapshot: reorderCardInDeckCache(queryCache, vars)
    }),
    onError: (_error, { deck_id }, { snapshot }) => {
      if (snapshot) queryCache.setQueryData(cardsInDeckQueryKey(deck_id), snapshot)
    },
    onSettled: (_data, _error, { deck_id }) => {
      invalidateDeck(queryCache, deck_id)
    }
  })
}
