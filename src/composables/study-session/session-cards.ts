import { onMounted, ref } from 'vue'
import { useStudySessionCardsQuery } from '@/api/cards'

type UseSessionCardsOptions = {
  deckId: () => number | undefined
  studyAllCards: () => boolean
  seed: (cards: Card[]) => void
  onMissingDeck: () => void
}

/**
 * Bootstraps the session's card queue. Forces a fresh fetch on mount and seeds
 * the queue only from its resolved state, then clears `loading`.
 *
 * Pinia Colada exposes the cached value synchronously while a background
 * refetch runs, and after the prior session's review flush the cache often
 * holds an empty `[]` (everything was capped/done) or cards with future-dated
 * `review.due` timestamps the FE due-filter rejects. Seeding from either
 * snapshot ends the session immediately, so we await `refetch()` to guarantee
 * the queue is populated from server truth.
 */
export function useSessionCards({
  deckId,
  studyAllCards,
  seed,
  onMissingDeck
}: UseSessionCardsOptions) {
  const loading = ref(true)
  const query = useStudySessionCardsQuery(() => deckId()!, studyAllCards)

  onMounted(async () => {
    if (!deckId()) {
      onMissingDeck()
      return
    }

    const state = await query.refetch()
    if (state.status !== 'success') return

    seed(state.data ?? [])
    loading.value = false
  })

  return { loading }
}
