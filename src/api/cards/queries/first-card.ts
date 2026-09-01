import { useQuery } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'
import { fetchCardsPageByDeckId } from '../db'

export function useFirstCardInDeckQuery(deck_id: MaybeRefOrGetter<number | undefined>) {
  return useQuery({
    key: () => ['cards', toValue(deck_id) ?? 0, 'first'],
    query: () =>
      fetchCardsPageByDeckId({ deck_id: toValue(deck_id) as number, offset: 0, limit: 1 }),
    enabled: () => Boolean(toValue(deck_id))
  })
}
