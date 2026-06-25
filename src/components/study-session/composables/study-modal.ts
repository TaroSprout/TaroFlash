import { defineAsyncComponent } from 'vue'
import { useModal } from '@/composables/modal'
import { emitSfx } from '@/sfx/bus'

const StudySession = defineAsyncComponent(() => import('@/components/study-session/index.vue'))

export type SecondaryAction = 'study-more' | 'study-all' | 'study-again'

export function useStudyModal() {
  const modal = useModal()

  async function start(deck: Deck, config_override?: Partial<DeckConfig>) {
    emitSfx('generic_notification_9')
    const action = await _openStudySession(deck, config_override)

    if (action === 'study-more') {
      await start(deck)
    } else if (action === 'study-all' || action === 'study-again') {
      await start(deck, { study_all_cards: true })
    }
  }

  function _openStudySession(deck: Deck, config_override?: Partial<DeckConfig>) {
    const result = modal.open<SecondaryAction | undefined>(StudySession, {
      backdrop: true,
      mode: 'popup',
      props: { deck, config_override }
    })

    return result.response
  }

  return { start }
}
