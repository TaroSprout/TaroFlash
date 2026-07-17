import { useModal } from '@/composables/modal'
import { emitSfx } from '@/sfx/bus'
import StudySession from '@/views/study-session/index.vue'

export function useStudyModal() {
  const modal = useModal()

  /**
   * Opens a study session over one or more decks. Pass `[deck]` for a single
   * deck or several to merge their due cards into one session; the session is
   * deck-agnostic past this point and works on the merged queue.
   */
  function start(decks: Deck[]) {
    emitSfx('generic_notification_9')
    return modal.open(StudySession, {
      backdrop: true,
      mode: 'popup',
      props: { decks }
    }).response
  }

  return { start }
}
