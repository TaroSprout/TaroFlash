import { onMounted } from 'vue'
import { useStudyModal } from './study-modal'
import { readPersistedSession } from './session-persistence'

/**
 * Reopens an in-progress study session after a page refresh. sessionStorage
 * only tells us which decks the session belongs to; the modal's own bootstrap
 * (session-cards.ts) refetches the resolved decks + rebuilds the locked queue
 * once it remounts, so passing the persisted ids straight through is enough.
 */
export function useResumeStudySession() {
  onMounted(() => {
    const persisted = readPersistedSession()
    if (!persisted?.deck_ids.length) return

    useStudyModal().start(persisted.deck_ids)
  })
}
