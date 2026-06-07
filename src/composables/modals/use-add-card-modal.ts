import { defineAsyncComponent } from 'vue'
import { useModal } from '@/composables/modal'
import { emitSfx } from '@/sfx/bus'

const AddCardModal = defineAsyncComponent(
  () => import('@/views/audio-reader/term-popover/add-card-modal.vue')
)

/**
 * Open the add-flashcard modal pre-filled with a term and its translation.
 * Renders as a centered dialog on desktop and a bottom sheet below `md`.
 * Resolves to `true` when a card was saved, `false`/undefined when cancelled.
 */
export function useAddCardModal() {
  const modal = useModal()

  function open(front: string, back: string) {
    emitSfx('ui.alert_clicks_wooden')
    const result = modal.open<boolean>(AddCardModal, {
      backdrop: true,
      mode: 'mobile-sheet',
      mobile_below_width: 'md',
      props: { front, back }
    })
    result.response.then(() => emitSfx('ui.pop_up_close'))
    return result
  }

  return { open }
}
