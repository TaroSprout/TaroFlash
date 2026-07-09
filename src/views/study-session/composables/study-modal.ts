import { useModal } from '@/composables/modal'
import { emitSfx } from '@/sfx/bus'
import StudySession from '@/views/study-session/index.vue'

export type SecondaryAction = 'study-more' | 'study-all' | 'study-again'

export function useStudyModal() {
  const modal = useModal()

  /**
   * Opens a study session over one or more decks. Pass `[deck]` for a single
   * deck or several to merge their due cards into one session; the session is
   * deck-agnostic past this point and works on the merged queue.
   */
  async function start(decks: Deck[], config_override?: Partial<DeckConfig>) {
    emitSfx('generic_notification_9')
    const action = await _openStudySession(decks, config_override)

    if (action === 'study-more') {
      await start(decks)
    } else if (action === 'study-all' || action === 'study-again') {
      await start(decks, { study_all_cards: true })
    }
  }

  function _openStudySession(decks: Deck[], config_override?: Partial<DeckConfig>) {
    const result = modal.open<SecondaryAction | undefined>(StudySession, {
      backdrop: true,
      mode: 'popup',
      props: { decks, config_override }
    })

    return result.response
  }

  return { start }
}
