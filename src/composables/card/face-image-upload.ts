import {
  computed,
  onBeforeUnmount,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type ShallowRef
} from 'vue'
import { useI18n } from 'vue-i18n'
import { useCardMutations } from './mutations'
import { useCardImageGate } from './image-gate'
import { useImageDropzone } from './image-dropzone'
import { useNoticeStore } from '@/stores/notice-store'
import { emitSfx } from '@/sfx/bus'
import { collapseFaceImage, revealFaceImage } from '@/utils/animations/face-image'

// Well below the storage bucket's 10 MiB backstop — card images render small.
export const CARD_IMAGE_MAX_BYTES = 2 * 1024 * 1024

// How long a fresh drop/pick suppresses the replace scrim, so the new image stays visible.
const SUPPRESS_HOVER_MS = 1000

type UseFaceImageUploadOptions = {
  card: MaybeRefOrGetter<Card>
  side: MaybeRefOrGetter<'front' | 'back'>
  fileInput: Readonly<ShallowRef<HTMLInputElement | null>>
  /** The uploader root element, used to dismiss a lingering error on outside click. */
  rootEl: () => HTMLElement | undefined
}

/**
 * Drives one card face's image-upload interaction: drag/drop + file-picker
 * plumbing, the hover/drag/error overlay state, and the upload/remove actions.
 * Layout-agnostic — the consumer decides how to present `active`/`has_image`.
 */
export function useFaceImageUpload({ card, side, fileInput, rootEl }: UseFaceImageUploadOptions) {
  const { t } = useI18n()
  const notice = useNoticeStore()
  const { guardCardImage } = useCardImageGate()
  const mutations = useCardMutations(() => toValue(card).deck_id)

  const hovered = ref(false)
  const hover_suppressed = ref(false)
  const pending = ref(false)
  let reveal_pending = false
  let suppress_timer: ReturnType<typeof setTimeout> | undefined

  const {
    dragging,
    error: file_error,
    clearError,
    accept,
    browse,
    onFileChange,
    onDragEnter,
    onDragLeave,
    onDragOver,
    onDrop
  } = useImageDropzone({
    maxBytes: CARD_IMAGE_MAX_BYTES,
    fileInput,
    onFile: uploadFile,
    onError: () => emitSfx('digi_powerdown'),
    guard: guardCardImage
  })

  const image_path = computed(() =>
    toValue(side) === 'front' ? toValue(card).front_image_path : toValue(card).back_image_path
  )
  const has_image = computed(() => !!image_path.value)
  // Temp cards (id <= 0) aren't persisted yet, and image RPCs need a real row.
  const can_upload = computed(() => (toValue(card).id ?? 0) > 0)
  // Also true on an error, so the image stays in its hover state behind the error scrim.
  const active = computed(
    () => ((hovered.value || dragging.value) && !hover_suppressed.value) || !!file_error.value
  )
  // Blocks focus/typing behind a drag or error overlay the user can't see past.
  const covered = computed(() => dragging.value || !!file_error.value)

  onBeforeUnmount(() => {
    clearTimeout(suppress_timer)
    document.removeEventListener('pointerdown', onDocumentPointerDown)
  })

  /** Upload a validated file to this face, suppressing the scrim afterwards. */
  async function uploadFile(file: File) {
    if (!can_upload.value) return

    suppressHover()
    pending.value = true

    try {
      await mutations.setCardImage(toValue(card).id!, toValue(side), file)
    } catch (err) {
      const cause = err instanceof Error ? err.cause : undefined
      notice.error(
        cause === 'insert'
          ? t('toast.error.card-image-save-failed')
          : t('toast.error.card-image-upload-failed')
      )
      pending.value = false
      return
    }

    emitSfx('music_plink_ok')
    reveal_pending = true
    pending.value = false
  }

  /** The currently rendered image element for this face, across layouts. */
  function faceImageEl() {
    return rootEl()?.querySelector<HTMLElement>(
      '[data-testid="image-dropzone__image"], [data-testid="card-face__image"]'
    )
  }

  /** Scale-in the image once the new face has rendered. */
  function revealUploadedImage() {
    const img = faceImageEl()
    if (img) revealFaceImage(img)
  }

  /**
   * Remove this face's image. Clicks snap; the image scales down before the
   * deletion runs, and the trash sfx plays once the removal lands.
   */
  async function onRemove() {
    emitSfx('snappy_button_5')
    clearError()

    const img = faceImageEl()
    if (img) await collapseFaceImage(img)

    pending.value = true

    try {
      await mutations.deleteCardImage(toValue(card).id!, toValue(side))
      emitSfx('trash_crumple_short')
    } catch {
      notice.error(t('toast.error.card-image-delete-failed'))
    } finally {
      pending.value = false
    }
  }

  /**
   * Open the file picker, gated on the paid-images check. A free member gets the
   * upgrade alert instead; the drop path is gated via the dropzone `guard`.
   */
  async function openPicker() {
    if (!(await guardCardImage())) return

    emitSfx('select')
    browse()
  }

  function onDismissError() {
    emitSfx('snappy_button_5')
    clearError()
  }

  // Holds the replace scrim off until the pointer leaves once, or the timeout releases it.
  function suppressHover() {
    hover_suppressed.value = true
    clearTimeout(suppress_timer)
    suppress_timer = setTimeout(() => (hover_suppressed.value = false), SUPPRESS_HOVER_MS)
  }

  function onPointerEnter() {
    hovered.value = true
  }

  function onPointerLeave() {
    hovered.value = false
    clearTimeout(suppress_timer)
    hover_suppressed.value = false
  }

  // Dismiss a lingering error when the user commits attention to another card.
  function onDocumentPointerDown(e: PointerEvent) {
    const root = rootEl()
    if (root && !root.contains(e.target as Node)) onDismissError()
  }

  // Chime once when a drag first enters the card (not on every child dragenter).
  watch(dragging, (now, was) => {
    if (now && !was && can_upload.value) emitSfx('music_plink_mid')
  })

  // Reveal waits for the refetched path to reach the DOM, not the upload call. `flush: 'post'`
  // so the freshly-mounted <img> is queryable.
  watch(
    image_path,
    (path) => {
      if (!reveal_pending || !path) return
      reveal_pending = false
      revealUploadedImage()
    },
    { flush: 'post' }
  )

  // Only listen for outside clicks while an error is actually showing.
  watch(file_error, (err) => {
    if (err) document.addEventListener('pointerdown', onDocumentPointerDown)
    else document.removeEventListener('pointerdown', onDocumentPointerDown)
  })

  return {
    accept,
    onFileChange,
    onDragEnter,
    onDragLeave,
    onDragOver,
    onDrop,
    dragging,
    file_error,
    clearError,
    hovered,
    active,
    covered,
    pending,
    has_image,
    image_path,
    can_upload,
    onRemove,
    openPicker,
    onDismissError,
    onPointerEnter,
    onPointerLeave
  }
}
