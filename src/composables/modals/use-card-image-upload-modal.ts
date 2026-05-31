import { defineAsyncComponent } from 'vue'
import { useModal } from '@/composables/modal'
import { emitSfx } from '@/sfx/bus'
import type {
  CardImageTarget,
  CardImageUploadResponse
} from '@/components/modals/card-image-upload/index.vue'

const CardImageUpload = defineAsyncComponent(
  () => import('@/components/modals/card-image-upload/index.vue')
)

type CardImageUploadOptions = {
  // 'cover' shows a single dropzone; 'faces' shows front + back side by side.
  target: CardImageTarget
  // Max accepted file size in bytes; callers tune this per asset type.
  max_bytes?: number
  // Existing image URLs to preload, so removals/replacements can be expressed.
  front_image?: string
  back_image?: string
  cover_image?: string
}

/**
 * Open the card image-upload modal for a deck cover or a card's two faces.
 * Resolves with a {@link CardImageUploadResponse} keyed on `target`, or
 * `undefined` when the user dismisses the modal without confirming.
 *
 * Each face/cover slot resolves to a `File` (set), `null` (existing image
 * removed), or `undefined` (untouched) — callers apply only what changed.
 *
 * @example
 * const cardImageModal = useCardImageUploadModal()
 * const res = await cardImageModal.open({
 *   target: 'faces',
 *   front_image: frontUrl,
 *   back_image: backUrl
 * }).response
 * if (res?.target === 'faces') applyFaces(res.front, res.back)
 */
export function useCardImageUploadModal() {
  const modal = useModal()

  function open(options: CardImageUploadOptions) {
    emitSfx('ui.alert_clicks_wooden')
    const result = modal.open<CardImageUploadResponse>(CardImageUpload, {
      backdrop: true,
      mode: 'mobile-sheet',
      props: options
    })
    result.response.then(() => emitSfx('ui.pop_up_close'))
    return result
  }

  return { open }
}
