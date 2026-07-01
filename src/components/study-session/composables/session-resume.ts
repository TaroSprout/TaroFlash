import { onMounted } from 'vue'
import { useDecksByIdsQuery } from '@/api/decks'
import { useStudyModal } from './study-modal'
import { readPersistedSession, clearPersistedSession } from './session-persistence'

/**
 * Reopens an in-progress study session after a page refresh. sessionStorage
 * only tells us which decks the session belongs to — the modal's own restore
 * logic (session-cards.ts) rebuilds the locked queue once it remounts.
 */
export function useResumeStudySession() {
  onMounted(async () => {
    const persisted = readPersistedSession()
    if (!persisted) return

    const { data } = await useDecksByIdsQuery(persisted.deck_ids).refetch()
    const decks = data ?? []

    if (!decks.length) {
      clearPersistedSession()
      return
    }

    useStudyModal().start(decks, persisted.config_override)
  })
}
