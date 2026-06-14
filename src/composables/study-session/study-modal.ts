import { defineAsyncComponent } from 'vue'
import { useModal } from '@/composables/modal'
import { emitSfx } from '@/sfx/bus'
import type { StudySessionResponse } from '@/components/modals/study-session/index.vue'

const StudySession = defineAsyncComponent(
  () => import('@/components/modals/study-session/index.vue')
)
const SessionComplete = defineAsyncComponent(
  () => import('@/components/modals/study-session/session-complete.vue')
)

export type SecondaryAction = 'study-more' | 'study-all' | 'study-again'

export function useStudyModal() {
  const modal = useModal()

  async function start(deck: Deck, config_override?: Partial<DeckConfig>) {
    emitSfx('ui.slide_up')
    const payload = await _openStudySession(deck, config_override)
    emitSfx('ui.slide_up')

    if (payload) {
      const action = await _openSessionComplete(payload, deck.cover_config?.theme)
      emitSfx('ui.slide_up')

      if (action === 'study-more') {
        await start(deck)
      } else if (action === 'study-all' || action === 'study-again') {
        await start(deck, { study_all_cards: true })
      }
    }
  }

  function _openStudySession(deck: Deck, config_override?: Partial<DeckConfig>) {
    const result = modal.open<StudySessionResponse>(StudySession, {
      backdrop: true,
      mode: 'mobile-sheet',
      props: { deck, config_override }
    })

    return result.response
  }

  async function _openSessionComplete(
    { score, total, remaining_due, study_all_used }: StudySessionResponse,
    theme?: Theme
  ) {
    await new Promise((resolve) => setTimeout(resolve, 300))

    const secondary_action: SecondaryAction = study_all_used
      ? 'study-again'
      : remaining_due > 0
        ? 'study-more'
        : 'study-all'

    emitSfx('ui.music_pizz_duo_hi')
    const result = modal.open<SecondaryAction | undefined>(SessionComplete, {
      backdrop: true,
      mode: 'mobile-sheet',
      props: { score, total, secondary_action, theme }
    })

    return result.response
  }

  return { start }
}
