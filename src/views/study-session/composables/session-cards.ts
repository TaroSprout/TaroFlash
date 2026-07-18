import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionBootstrapQuery, useCardsByIdsQuery } from '@/api/cards'
import { useNoticeStore } from '@/stores/notice-store'
import { readPersistedSession, type PersistedSession } from './session-persistence'

type UseSessionCardsOptions = {
  deckIds: () => number[]
  seed: (cards: Card[]) => void
  restore: (cards: Card[], persisted: PersistedSession) => void
  onMissingDeck: () => void
}

/**
 * Bootstraps a study session across one or more decks in a single request:
 * resolves the decks (pacing + appearance) and the merged, server-capped study
 * queue, then seeds the session from server truth. Exposes the resolved
 * `sessionDecks` so the controller can schedule per deck and the shell can
 * render titles/covers.
 *
 * Pinia Colada exposes the cached value synchronously while a background refetch
 * runs, and after the prior session's review flush the cache often holds a stale
 * snapshot (everything capped/done, or future-dated cards). Seeding from that
 * ends the session immediately, so we await `refetch()` for a populated queue.
 *
 * If a sessionStorage snapshot exists (a refresh mid-session), the locked queue
 * from that snapshot is restored by id instead of re-selecting due cards —
 * otherwise newly-due cards would leak into an in-progress session. The decks
 * still come from the bootstrap (its card list is ignored on restore).
 */
export function useSessionCards({ deckIds, seed, restore, onMissingDeck }: UseSessionCardsOptions) {
  const { t } = useI18n()
  const notice = useNoticeStore()

  const loading = ref(true)
  const sessionDecks = ref<SessionDeck[]>([])

  const bootstrap_query = useSessionBootstrapQuery(deckIds)

  const restore_ids = ref<number[]>([])
  const restore_query = useCardsByIdsQuery(restore_ids)

  onMounted(load)

  async function load() {
    if (!deckIds().length) {
      onMissingDeck()
      return
    }

    loading.value = true

    const bootstrap = await bootstrap_query.refetch()
    if (bootstrap.status !== 'success') {
      _handleLoadFailure()
      return
    }

    sessionDecks.value = bootstrap.data?.decks ?? []

    const persisted = readPersistedSession()
    if (persisted) {
      await _restoreSession(persisted)
      return
    }

    seed(bootstrap.data?.cards ?? [])
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

  return { loading, sessionDecks }
}
