import { defineAsyncComponent } from 'vue'
import { useModal } from '@/composables/modal'
import { emitSfx } from '@/sfx/bus'
import type { LessonReaderResponse } from '@/components/modals/lesson-reader/index.vue'

const LessonReader = defineAsyncComponent(
  () => import('@/components/modals/lesson-reader/index.vue')
)

/** Open the lesson reader (audio + transcript) for `id` in a modal. */
export function useLessonReaderModal() {
  const modal = useModal()

  function open(id: number) {
    emitSfx('ui.alert_clicks_wooden')
    const result = modal.open<LessonReaderResponse>(LessonReader, {
      props: { id },
      backdrop: true,
      mode: 'mobile-sheet'
    })
    result.response.then(() => emitSfx('ui.pop_up_close'))
    return result
  }

  return { open }
}
