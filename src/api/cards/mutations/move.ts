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

/** The order a deck reads in, matching the server's exactly. */
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
 * Settles a dropped card into its new place immediately, so the row doesn't
 * snap back while the server catches up. Returns the order to undo back to.
 *
 * Re-sorted rather than spliced to the drop index, so it lands exactly where
 * the server will put it.
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

/** Moves a single card to a new place in its deck. */
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
