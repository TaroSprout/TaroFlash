import { defineAsyncComponent } from 'vue'
import { useModal } from '@/composables/modal'
import { emitSfx } from '@/sfx/bus'
import type { DeckCreateResponse } from '@/components/modals/deck-create/index.vue'

const DeckCreate = defineAsyncComponent(() => import('@/components/modals/deck-create/index.vue'))

/** Open the create-deck modal. Resolves true when the deck was saved. */
export function useDeckCreateModal() {
  const modal = useModal()

  function open() {
    emitSfx('ui.snappy_button_3')
    const result = modal.open<DeckCreateResponse>(DeckCreate, {
      backdrop: true,
      mode: 'mobile-sheet'
    })
    result.response.then(() => emitSfx('ui.pop_up_close'))
    return result
  }

  return { open }
}
