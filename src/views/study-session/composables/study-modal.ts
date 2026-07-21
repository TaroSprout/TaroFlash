import { useOverlay } from '@/composables/overlay/use-overlay'
import StudySession from '@/views/study-session/index.vue'

export function useStudyModal() {
  const { open } = useOverlay()

  /**
   * Opens a study session over one or more decks, by id. Pass `[id]` for a
   * single deck or several to merge their due cards into one session; the modal
   * fetches the resolved decks + merged queue itself, so callers only supply
   * ids (and a refresh-resume can reopen from persisted ids alone).
   */
  function start(deck_ids: number[]) {
    return open(StudySession, {
      props: { deck_ids },
      presentation: 'popup',
      open_sfx: 'generic_notification_9'
    }).result
  }

  return { start }
}
