import { defineAsyncComponent } from 'vue'
import { useModal } from '@/composables/modal'
import { emitSfx } from '@/sfx/bus'
import type { UploadLessonResponse } from '@/components/modals/upload-lesson/index.vue'

const UploadLesson = defineAsyncComponent(
  () => import('@/components/modals/upload-lesson/index.vue')
)

/** Open the upload-lesson modal. Resolves to the created Lesson, or undefined if cancelled. */
export function useUploadLessonModal() {
  const modal = useModal()

  function open() {
    emitSfx('ui.alert_clicks_wooden')
    const result = modal.open<UploadLessonResponse>(UploadLesson, {
      backdrop: true,
      mode: 'mobile-sheet'
    })
    result.response.then(() => emitSfx('ui.pop_up_close'))
    return result
  }

  return { open }
}
