import { useQuery } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'
import { fetchCardsPageByDeckId } from '../db'

/**
 * A deck's first card by rank, and nothing else — powers the design tab's
 * live text preview. Deliberately not the infinite page query: the preview
 * only ever reads one card's front/back text, so it asks for exactly one row.
 */
export function useFirstCardInDeckQuery(deck_id: MaybeRefOrGetter<number | undefined>) {
  return useQuery({
    key: () => ['cards', toValue(deck_id) ?? 0, 'first'],
    query: () =>
      fetchCardsPageByDeckId({ deck_id: toValue(deck_id) as number, offset: 0, limit: 1 }),
    enabled: () => Boolean(toValue(deck_id))
  })
}
