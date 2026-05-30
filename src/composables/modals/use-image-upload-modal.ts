import { defineAsyncComponent } from 'vue'
import { useModal } from '@/composables/modal'
import { emitSfx } from '@/sfx/bus'
import type { ImageUploadModalResponse } from '@/components/modals/image-upload.vue'

const ImageUpload = defineAsyncComponent(() => import('@/components/modals/image-upload.vue'))

type ImageUploadOptions = {
  // Max accepted file size in bytes; callers tune this per asset type.
  max_bytes?: number
}

/**
 * Open the reusable image-upload modal. Resolves with the chosen `File`, or
 * `undefined` when the user dismisses the modal without confirming a selection.
 *
 * @param options - per-callsite constraints (e.g. `max_bytes`).
 * @example
 * const imageUploadModal = useImageUploadModal()
 * const file = await imageUploadModal.open({ max_bytes: 2 * 1024 * 1024 }).response
 * if (file) upload(file)
 */
export function useImageUploadModal() {
  const modal = useModal()

  function open(options: ImageUploadOptions = {}) {
    emitSfx('ui.alert_clicks_wooden')
    const result = modal.open<ImageUploadModalResponse>(ImageUpload, {
      backdrop: true,
      mode: 'mobile-sheet',
      props: options
    })
    result.response.then(() => emitSfx('ui.pop_up_close'))
    return result
  }

  return { open }
}
