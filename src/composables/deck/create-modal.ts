import { useModal } from '@/composables/modal'
import { emitSfx } from '@/sfx/bus'
import DeckCreate, { type DeckCreateResponse } from '@/views/deck/deck-create-modal.vue'

/** Open the create-deck modal. Resolves true when the deck was saved. */
export function useDeckCreateModal() {
  const modal = useModal()

  function open() {
    emitSfx('snappy_button_3')
    const result = modal.open<DeckCreateResponse>(DeckCreate, {
      backdrop: true,
      mode: 'mobile-sheet',
      mobile_below_width: 'md',
      mobile_below_height: 'md'
    })
    result.response.then(() => emitSfx('snappy_button_5'))
    return result
  }

  return { open }
}
