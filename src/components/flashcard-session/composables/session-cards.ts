import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMultiDeckStudyCardsQuery, useCardsByIdsQuery } from '@/api/cards'
import { useNoticeStore } from '@/stores/notice-store'
import { readPersistedSession, type PersistedSession } from './session-persistence'

type UseSessionCardsOptions = {
  deckIds: () => number[]
  studyAllCards: () => boolean
  seed: (cards: Card[]) => void
  restore: (cards: Card[], persisted: PersistedSession) => void
  onMissingDeck: () => void
}

/**
 * Bootstraps the session's card queue across one or more decks. Forces a fresh
 * fetch on mount and seeds the queue only from its resolved state, then clears
 * `loading`. A single-deck session is just a one-element `deckIds`; the merged
 * queue arrives deck-by-deck so an unshuffled session studies decks in order.
 *
 * Pinia Colada exposes the cached value synchronously while a background
 * refetch runs, and after the prior session's review flush the cache often
 * holds an empty `[]` (everything was capped/done) or cards with future-dated
 * `review.due` timestamps the FE due-filter rejects. Seeding from either
 * snapshot ends the session immediately, so we await `refetch()` to guarantee
 * the queue is populated from server truth.
 *
 * If a sessionStorage snapshot exists (a refresh mid-session), the locked
 * queue from that snapshot is restored instead of fetching a fresh due-cards
 * queue — otherwise newly-due cards would leak into an in-progress session.
 */
export function useSessionCards({
  deckIds,
  studyAllCards,
  seed,
  restore,
  onMissingDeck
}: UseSessionCardsOptions) {
  const { t } = useI18n()
  const notice = useNoticeStore()

  const loading = ref(true)
  const query = useMultiDeckStudyCardsQuery(deckIds, studyAllCards)

  const restore_ids = ref<number[]>([])
  const restore_query = useCardsByIdsQuery(restore_ids)

  onMounted(load)

  async function load() {
    if (!deckIds().length) {
      onMissingDeck()
      return
    }

    loading.value = true

    const persisted = readPersistedSession()
    if (persisted) {
      await _restoreSession(persisted)
      return
    }

    const state = await query.refetch()
    if (state.status !== 'success') {
      _handleLoadFailure()
      return
    }

    seed(state.data ?? [])
    loading.value = false
  }

  async function _restoreSession(persisted: PersistedSession) {
    const reviewed_ids = new Set(persisted.results.map((r) => r.card_id))
    restore_ids.value = persisted.card_ids.filter((id) => !reviewed_ids.has(id))

    if (!restore_ids.value.length) {
      restore([], persisted)
      loading.value = false
      return
    }

    const state = await restore_query.refetch()
    if (state.status !== 'success') {
      _handleLoadFailure()
      return
    }

    restore(state.data ?? [], persisted)
    loading.value = false
  }

  /** Bootstrap fetch failed — stop the spinner and offer a retry via a blocking panel. */
  function _handleLoadFailure() {
    loading.value = false
    notice.error(t('study-session.load-error'), {
      subMessage: t('study-session.load-error-sub'),
      variant: 'panel',
      actions: [{ label: t('notice.retry-label'), onClick: load, closesOnClick: true }]
    })
  }

  return { loading }
}
