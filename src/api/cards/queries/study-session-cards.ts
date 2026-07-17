import { useQuery } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'
import { fetchStudySessionCards } from '../db'

/**
 * Server-built study queue for a deck. Applies daily caps + new/review
 * partition on the backend; FE just consumes the ordered result.
 */
export function useStudySessionCardsQuery(deck_id: MaybeRefOrGetter<number>) {
  return useQuery({
    key: () => ['cards', toValue(deck_id), 'study-session'],
    query: () => fetchStudySessionCards(toValue(deck_id))
  })
}
