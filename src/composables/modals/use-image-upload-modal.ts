import { defineAsyncComponent } from 'vue'
import { useModal } from '@/composables/modal'
import { emitSfx } from '@/sfx/bus'
import type { ImageUploadModalResponse } from '@/components/modals/image-upload.vue'

const ImageUpload = defineAsyncComponent(() => import('@/components/modals/image-upload.vue'))

/**
 * Open the reusable image-upload modal. Resolves with the chosen `File`, or
 * `undefined` when the user dismisses the modal without confirming a selection.
 *
 * @example
 * const imageUploadModal = useImageUploadModal()
 * const file = await imageUploadModal.open().response
 * if (file) upload(file)
 */
export function useImageUploadModal() {
  const modal = useModal()

  function open() {
    emitSfx('ui.alert_clicks_wooden')
    const result = modal.open<ImageUploadModalResponse>(ImageUpload, {
      backdrop: true,
      mode: 'mobile-sheet'
    })
    result.response.then(() => emitSfx('ui.pop_up_close'))
    return result
  }

  return { open }
}
