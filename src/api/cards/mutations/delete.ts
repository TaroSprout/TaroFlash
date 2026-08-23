import { useMutation, useQueryCache, type EntryKey } from '@pinia/colada'
import type { CardBase } from '@type/card'
import { deleteCards, deleteCardsInDeck, type DeleteCardsInDeckParams } from '../db'
import type { CardsPage } from '../db'
import { invalidateAllCardCounts, invalidateCardIndex, invalidateDeck } from './_invalidate'

type QueryCache = ReturnType<typeof useQueryCache>

type CardPages = { pages: CardsPage[]; pageParams: unknown[] }

/** What each loaded view of the deck held before the cards were taken out. */
type DeleteSnapshot = { key: EntryKey; data: CardPages }[]

/**
 * Takes the deleted cards out of every loaded view of their decks — each sort
 * and each search the member has looked at, matched by key prefix so a list
 * read under a non-default sort loses the row too.
 *
 * @returns The prior contents of every view it touched, to put back if the
 *   delete is refused.
 */
function removeCardsFromDeckCaches(queryCache: QueryCache, cards: CardBase[]): DeleteSnapshot {
  const ids = new Set(cards.map((card) => card.id))
  const deck_ids = new Set(cards.map((card) => card.deck_id).filter((id) => id !== undefined))
  const snapshot: DeleteSnapshot = []

  const entries = [...deck_ids].flatMap((deck_id) =>
    queryCache.getEntries({ key: ['cards', deck_id, 'pages'] })
  )

  for (const entry of entries) {
    const data = entry.state.value.data as CardPages | undefined
    if (!data) continue

    snapshot.push({ key: entry.key, data })

    // Page offsets are re-derived from the loaded page lengths, so the
    // shortened pages need no renumbering here.
    queryCache.setQueryData<CardPages>(entry.key, {
      pages: data.pages.map((page) => ({
        ...page,
        cards: page.cards.filter((card) => card.id === undefined || !ids.has(card.id))
      })),
      pageParams: data.pageParams
    })
  }

  return snapshot
}

/**
 * Deletes an explicit set of cards, gone from the list as soon as it's
 * confirmed rather than when the server answers. A refusal puts them back.
 */
export function useDeleteCardsMutation() {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (cards: CardBase[]) => deleteCards(cards),
    onMutate: (cards: CardBase[]) => ({
      snapshot: removeCardsFromDeckCaches(queryCache, cards)
    }),
    onError: (_error, _cards, { snapshot }) => {
      snapshot?.forEach(({ key, data }) => queryCache.setQueryData<CardPages>(key, data))
    },
    onSettled: (_data, _error, cards) => {
      const deck_ids = new Set(cards.map((c) => c.deck_id).filter((id) => id !== undefined))
      deck_ids.forEach((id) => invalidateDeck(queryCache, id))
      invalidateAllCardCounts(queryCache)
      invalidateCardIndex(queryCache)
    }
  })
}

export function useDeleteCardsInDeckMutation() {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (params: DeleteCardsInDeckParams) => deleteCardsInDeck(params),
    onSettled: (_data, _error, { deck_id }) => {
      invalidateDeck(queryCache, deck_id)
      invalidateAllCardCounts(queryCache)
      invalidateCardIndex(queryCache)
    }
  })
}
