import { defineAsyncComponent } from 'vue'
import { useModal } from '@/composables/modal'
import { emitSfx } from '@/sfx/bus'
import type { UploadLessonResponse } from '@/components/modals/upload-lesson/index.vue'

const UploadLesson = defineAsyncComponent(
  () => import('@/components/modals/upload-lesson/index.vue')
)

/**
 * Open the upload-lesson modal for a collection. Resolves to the created
 * Lesson, or undefined if cancelled.
 */
export function useUploadLessonModal() {
  const modal = useModal()

  function open(collection_id: number) {
    emitSfx('snappy_button_3')
    const result = modal.open<UploadLessonResponse>(UploadLesson, {
      props: { collection_id },
      backdrop: true,
      mode: 'mobile-sheet'
    })
    result.response.then(() => emitSfx('pop_up_close'))
    return result
  }

  return { open }
}
