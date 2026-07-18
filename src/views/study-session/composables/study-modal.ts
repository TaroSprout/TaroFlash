import { useModal } from '@/composables/modal'
import { emitSfx } from '@/sfx/bus'
import StudySession from '@/views/study-session/index.vue'

export function useStudyModal() {
  const modal = useModal()

  /**
   * Opens a study session over one or more decks, by id. Pass `[id]` for a
   * single deck or several to merge their due cards into one session; the modal
   * fetches the resolved decks + merged queue itself, so callers only supply
   * ids (and a refresh-resume can reopen from persisted ids alone).
   */
  function start(deck_ids: number[]) {
    emitSfx('generic_notification_9')
    return modal.open(StudySession, {
      backdrop: true,
      mode: 'popup',
      props: { deck_ids }
    }).response
  }

  return { start }
}
