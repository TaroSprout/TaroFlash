import { useModal } from '@/composables/modal'
import AdvancedPacingModal from './advanced-pacing-modal/index.vue'
import type { DeckPacingEditorState } from '@/utils/deck/payload'

/** Opens the advanced pacing modal (desired retention + learning/relearning steps) for one deck. */
export function useAdvancedPacingModal() {
  const modal = useModal()

  function open(deck: Deck, pacing: DeckPacingEditorState) {
    return modal.open(AdvancedPacingModal, {
      props: { deck, pacing },
      backdrop: true,
      mode: 'popup'
    })
  }

  return { open }
}
