import { computed, onScopeDispose, shallowRef, toValue, type MaybeRefOrGetter } from 'vue'
import { useI18n } from 'vue-i18n'
import { useImageDropzone } from '@/composables/card'
import { useUploadImageMutation, insertMedia, deleteDeckCoverImage } from '@/api/media'
import { useMemberStore } from '@/stores/member'
import { emitSfx } from '@/sfx/bus'
import { hashFile } from '@/utils/hash'
import { bytesToMbLabel } from '@/utils/file-size'
import { collapseFaceImage } from '@/utils/animations/face-image'

// One-per-deck, so the cap is generous — still under the bucket's 10 MiB backstop.
export const COVER_IMAGE_MAX_BYTES = 5 * 1024 * 1024

const BUCKET = 'member-images'

export type CoverImage = ReturnType<typeof useCoverImage>

/**
 * Drives the deck-cover image picker for the settings design preview. Unlike the
 * card uploader, a picked file is STAGED — a local objectURL previews instantly
 * in `cover_config.image_path`, and the real upload + media row land on Save via
 * {@link commit}. No paid gate; a custom cover is free.
 *
 * @param cover - Getter for the draft's reactive `cover_config`.
 * @param deckId - Getter for the deck id (absent for a brand-new deck).
 */
export function useCoverImage(
  cover: MaybeRefOrGetter<DeckCover>,
  deckId: MaybeRefOrGetter<number | undefined>
) {
  const { t } = useI18n()
  const upload_mutation = useUploadImageMutation()

  const file_input = shallowRef<HTMLInputElement | null>(null)
  // Bound by the rendered <img> (card-cover.vue), so onRemove has a handle to
  // collapse before the image is cleared.
  const image_el = shallowRef<HTMLImageElement | null>(null)
  // The picked File, held out of the draft (which is serialized on save) until
  // Save uploads it. Its objectURL lives in cover_config.image_path meanwhile.
  const staged_file = shallowRef<File | null>(null)
  let staged_url: string | null = null

  const {
    accept,
    dragging,
    error: file_error,
    clearError,
    browse,
    onFileChange,
    onDragEnter,
    onDragLeave,
    onDragOver,
    onDrop
  } = useImageDropzone({
    maxBytes: COVER_IMAGE_MAX_BYTES,
    fileInput: file_input,
    onFile: stageFile,
    onError: () => emitSfx('ui.rejected')
  })

  const has_image = computed(() => !!toValue(cover).image_path)

  const error_message = computed(() => {
    if (file_error.value === 'invalid-type') {
      return t('deck.settings-modal.cover.invalid-type-error')
    }
    if (file_error.value === 'too-large') {
      return t('deck.settings-modal.cover.too-large-error', {
        max: bytesToMbLabel(COVER_IMAGE_MAX_BYTES)
      })
    }
    return ''
  })

  onScopeDispose(revokeStaged)

  /** Stage a validated file: preview it via a fresh objectURL, hold the File for Save. */
  function stageFile(file: File) {
    revokeStaged()
    staged_url = URL.createObjectURL(file)
    staged_file.value = file
    toValue(cover).image_path = staged_url
    emitSfx('file.accepted')
  }

  /**
   * Clear the cover image — drops any staged file and reverts to
   * palette/pattern/icon. The image scales down before it clears, and the
   * trash sfx plays once the removal lands.
   */
  async function onRemove() {
    emitSfx('ui.press')
    clearError()

    if (image_el.value) await collapseFaceImage(image_el.value)

    revokeStaged()
    staged_file.value = null
    delete toValue(cover).image_path
    emitSfx('card.delete')
  }

  /** Open the file picker. No paid gate — a custom cover is free. */
  function openPicker() {
    emitSfx('ui.select')
    browse()
  }

  function onDismissError() {
    emitSfx('ui.press')
    clearError()
  }

  /**
   * Discard the staged file + preview objectURL, e.g. on Reset. The draft's own
   * reset restores `cover_config.image_path`; this only cleans up the File and
   * objectURL that live outside the draft.
   */
  function discardStaged() {
    revokeStaged()
    staged_file.value = null
  }

  /**
   * Save pre-step: uploads a staged file and swaps its objectURL for the real
   * public URL, or soft-deletes the cover row on a cleared image. Throws with
   * `cause: 'upload' | 'insert'` so the caller picks the right toast and aborts
   * the deck save.
   */
  async function commit() {
    const id = toValue(deckId)
    if (!id) return

    if (staged_file.value) {
      const file = staged_file.value
      const member_id = useMemberStore().id
      const ext = file.type.split('/')[1]
      // Content-addressed path, mirroring setCardImage: identical bytes collapse
      // to one storage object; member_id scopes dedup + satisfies storage RLS.
      const path = `${member_id}/${await hashFile(file)}.${ext}`

      let public_url: string
      try {
        public_url = await upload_mutation.mutateAsync({ bucket: BUCKET, path, file })
      } catch {
        throw new Error('Failed to upload cover image', { cause: 'upload' })
      }

      try {
        // The dedupe trigger soft-deletes any prior active cover row for this deck.
        await insertMedia({ bucket: BUCKET, path, deck_id: id, slot: 'deck_cover' })
      } catch {
        throw new Error('Failed to save cover image', { cause: 'insert' })
      }

      revokeStaged()
      staged_file.value = null
      toValue(cover).image_path = public_url
      return
    }

    // No staged file and no image → a removal (or a never-set cover). Soft-delete
    // any active cover row; a no-op when there was none.
    if (!has_image.value) await deleteDeckCoverImage(id)
  }

  function revokeStaged() {
    if (!staged_url) return
    URL.revokeObjectURL(staged_url)
    staged_url = null
  }

  return {
    accept,
    file_input,
    image_el,
    dragging,
    file_error,
    error_message,
    has_image,
    onFileChange,
    onDragEnter,
    onDragLeave,
    onDragOver,
    onDrop,
    openPicker,
    onRemove,
    onDismissError,
    discardStaged,
    commit
  }
}
