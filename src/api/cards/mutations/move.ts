import { setInfiniteQueryData, useMutation, useQueryCache } from '@pinia/colada'
import { moveCard, type MoveCardParams } from '../db'
import type { CardsPage } from '../db'
import { cardsInDeckQueryKey } from '../queries/cards-page'
import { invalidateDeck } from './_invalidate'

type QueryCache = ReturnType<typeof useQueryCache>

export type UseMoveCardMutationParams = MoveCardParams & {
  deck_id: number
}

type ReorderContext = { pages: CardsPage[]; pageParams: unknown[] } | undefined

/** Deck order: rank ascending, id breaking ties — the server's ORDER BY. */
function byRank(a: Card, b: Card): number {
  if (a.rank === b.rank) return (a.id ?? 0) - (b.id ?? 0)
  return (a.rank ?? '') < (b.rank ?? '') ? -1 : 1
}

/** Refill each page with the same number of cards it held before. */
function refillPages(pages: CardsPage[], flat: Card[]): CardsPage[] {
  let offset = 0

  return pages.map((page) => {
    const cards = flat.slice(offset, offset + page.cards.length)
    offset += page.cards.length
    return { ...page, cards }
  })
}

/**
 * Apply the card's new key to the deck's cached pages and re-sort, in place of
 * waiting for the refetch. Keeps the rendered order in lockstep with the drop so
 * the row doesn't snap back between drop and the server round-trip.
 *
 * Re-sorting rather than splicing to the drop index means the cache lands
 * exactly where the server will: the key alone decides the position, and plain
 * string comparison here matches the column's C collation there.
 *
 * Returns the pre-move snapshot for rollback, or `undefined` when the deck
 * isn't cached (nothing to reorder).
 */
function reorderCardInDeckCache(
  queryCache: QueryCache,
  { deck_id, card_id, rank }: UseMoveCardMutationParams
): ReorderContext {
  const key = cardsInDeckQueryKey(deck_id)
  const snapshot = queryCache.getQueryData(key) as ReorderContext
  if (!snapshot) return undefined

  setInfiniteQueryData<CardsPage>(queryCache, key, (old) => {
    const pages = old?.pages ?? []
    const pageParams = old?.pageParams ?? []

    const flat = pages
      .flatMap((page) => page.cards)
      .map((card) => (card.id === card_id ? { ...card, rank } : card))
      .sort(byRank)

    return { pages: refillPages(pages, flat), pageParams }
  })

  return snapshot
}

/**
 * Reposition a single card within its deck.
 *
 * `onMutate` optimistically re-keys and re-sorts the cached pages synchronously,
 * so the drag-reorder UI can settle the dropped row immediately. `onError`
 * restores the pre-move snapshot; `onSettled` invalidates the deck to reconcile.
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
