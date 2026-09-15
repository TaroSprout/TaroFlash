import { useOverlay } from '@/composables/overlay/use-overlay'
import UploadLesson, {
  type UploadLessonResponse
} from '@/views/audio-reader/upload-lesson-modal/index.vue'

/**
 * Open the upload-lesson modal for a collection. Resolves to the created
 * Lesson, or undefined if cancelled.
 */
export function useUploadLessonModal() {
  const { open } = useOverlay()

  function open_upload_lesson(collection_id: number) {
    return open<UploadLessonResponse>(UploadLesson, {
      props: { collection_id },
      presentation: 'dialog',
      open_sfx: 'dialog.open',
      close_sfx: 'dialog.close'
    })
  }

  return { open: open_upload_lesson }
}
