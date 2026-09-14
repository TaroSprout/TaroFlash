import { useOverlay } from '@/composables/overlay/use-overlay'
import FeedbackBoard from '@/components/feedback/feedback-board.vue'

/** Opens the feedback board modal. Shared by the phone launcher and any other entry point. */
export function useFeedbackModal() {
  const { open } = useOverlay()

  function open_feedback() {
    return open(FeedbackBoard, {
      presentation: 'dialog',
      open_sfx: 'dialog.open',
      close_sfx: 'dialog.close'
    })
  }

  return { open: open_feedback }
}
