import { defineAsyncComponent } from 'vue'
import { useModal } from '@/composables/modal'
import { emitSfx } from '@/sfx/bus'

const AddCardModal = defineAsyncComponent(
  () => import('@/views/audio-reader/term-popover/add-card-modal.vue')
)

/**
 * Open the add-flashcard modal pre-filled with a term and its translation, and
 * optionally a pre-selected deck. Renders as a centered dialog on desktop and a
 * bottom sheet below `md`. Resolves to `true` when a card was saved,
 * `false`/undefined when cancelled.
 *
 * @param deck_id - deck to pre-select; `null` leaves the picker empty.
 */
export function useAddCardModal() {
  const modal = useModal()

  function open(front: string, back: string, deck_id: number | null = null) {
    emitSfx('ui.alert_clicks_wooden')
    const result = modal.open<boolean>(AddCardModal, {
      backdrop: true,
      mode: 'mobile-sheet',
      mobile_below_width: 'md',
      props: { front, back, deck_id }
    })
    result.response.then(() => emitSfx('ui.pop_up_close'))
    return result
  }

  return { open }
}
