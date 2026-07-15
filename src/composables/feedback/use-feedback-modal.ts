import { useModal } from '@/composables/modal'
import { emitSfx } from '@/sfx/bus'
import FeedbackBoard from '@/components/feedback/feedback-board.vue'

/** Opens the feedback board modal. Shared by the phone launcher and any other entry point. */
export function useFeedbackModal() {
  const modal = useModal()

  function open() {
    emitSfx('snappy_button_3')
    const result = modal.open(FeedbackBoard, {
      backdrop: true,
      mode: 'mobile-sheet'
    })
    result.response.then(() => emitSfx('pop_up_close'))
    return result
  }

  return { open }
}
