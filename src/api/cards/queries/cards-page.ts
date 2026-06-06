import { useInfiniteQuery } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'
import { fetchCardsPageByDeckId } from '../db'

export const CARDS_PAGE_SIZE = 50

/**
 * Exact cache key for the deck's paginated cards query. Shared with mutations
 * that optimistically patch the cache (e.g. `useSaveCardMutation`) so the key
 * shape stays in one place and the two can't drift.
 */
export function cardsInDeckQueryKey(
  deck_id: number | undefined,
  page_size: number = CARDS_PAGE_SIZE
) {
  return ['cards', deck_id ?? 0, 'pages', page_size]
}

export function useCardsInDeckInfiniteQuery(
  deck_id: MaybeRefOrGetter<number | undefined>,
  page_size: number = CARDS_PAGE_SIZE
) {
  return useInfiniteQuery({
    key: () => cardsInDeckQueryKey(toValue(deck_id), page_size),
    initialPageParam: 0,
    query: ({ pageParam }) =>
      fetchCardsPageByDeckId({
        deck_id: toValue(deck_id) as number,
        offset: pageParam as number,
        limit: page_size
      }),
    getNextPageParam: (lastPage, allPages) => {
      // Short page → no more rows on the server.
      if (lastPage.length < page_size) return null
      return allPages.reduce((sum, page) => sum + page.length, 0)
    },
    enabled: () => Boolean(toValue(deck_id))
  })
}
