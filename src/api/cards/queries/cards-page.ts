import { useInfiniteQuery } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'
import { fetchCardsInDeck } from '../db'

export const CARDS_PAGE_SIZE = 50

/**
 * Cache key for the deck's paginated cards query. Includes sort_by and query
 * so Pinia Colada gives separate cache entries per active filter state, and
 * mutations can target the default view by passing the `'default'`/`''` pair.
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
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < page_size) return null
      return allPages.reduce((sum, page) => sum + page.length, 0)
    },
    enabled: () => Boolean(toValue(deck_id))
  })
}
