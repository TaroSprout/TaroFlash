import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDecksByIdsQuery } from '@/api/decks'
import { useNoticeStore } from '@/stores/notice-store'
import { useStudyModal } from './study-modal'
import { readPersistedSession, clearPersistedSession } from './session-persistence'

/**
 * Reopens an in-progress study session after a page refresh. sessionStorage
 * only tells us which decks the session belongs to — the modal's own restore
 * logic (session-cards.ts) rebuilds the locked queue once it remounts.
 */
export function useResumeStudySession() {
  const { t } = useI18n()
  const notice = useNoticeStore()

  onMounted(async () => {
    const persisted = readPersistedSession()
    if (!persisted) return

    let decks: Deck[]
    try {
      const { data } = await useDecksByIdsQuery(persisted.deck_ids).refetch()
      decks = data ?? []
    } catch {
      notice.error(t('study-session.resume-error'))
      return
    }

    if (!decks.length) {
      clearPersistedSession()
      return
    }

    useStudyModal().start(decks)
  })
}
