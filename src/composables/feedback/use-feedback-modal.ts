import { useOverlay } from '@/composables/overlay/use-overlay'
import FeedbackBoard from '@/components/feedback/feedback-board.vue'

/** Opens the feedback board modal. Shared by the phone launcher and any other entry point. */
export function useFeedbackModal() {
  const { open } = useOverlay()

  function open_feedback() {
    return open(FeedbackBoard, {
      presentation: 'dialog',
      open_sfx: 'snappy_button_3',
      close_sfx: 'pop_up_close'
    })
  }

  return { open: open_feedback }
}
