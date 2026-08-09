import { useInfiniteQuery } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'
import { fetchCardsInDeck } from '../db'

export const CARDS_PAGE_SIZE = 50

/**
 * Names one deck's card list. Sort and search are part of the name, so each
 * combination is kept separately — pass `'default'` and `''` for the plain list.
 */
export function cardsInDeckQueryKey(
  deck_id: number | undefined,
  sort_by: string = 'default',
  query: string = '',
  page_size: number = CARDS_PAGE_SIZE
) {
  return ['cards', deck_id ?? 0, 'pages', page_size, sort_by, query]
}

export function useCardsInDeckInfiniteQuery(
  deck_id: MaybeRefOrGetter<number | undefined>,
  sort_by: MaybeRefOrGetter<string> = 'default',
  search_query: MaybeRefOrGetter<string> = '',
  page_size: number = CARDS_PAGE_SIZE
) {
  return useInfiniteQuery({
    key: () =>
      cardsInDeckQueryKey(toValue(deck_id), toValue(sort_by), toValue(search_query), page_size),
    initialPageParam: 0,
    query: ({ pageParam }) =>
      fetchCardsInDeck({
        deck_id: toValue(deck_id) as number,
        sort_by: toValue(sort_by),
        query: toValue(search_query) || null,
        offset: pageParam as number,
        limit: page_size
      }),
    // Each page looks one row further than it shows, so "is there more" is known, not guessed.
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.next_rank === null) return null
      return allPages.reduce((sum, page) => sum + page.cards.length, 0)
    },
    enabled: () => Boolean(toValue(deck_id))
  })
}
