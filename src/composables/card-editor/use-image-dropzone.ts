import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const ACCEPT_ATTR = ACCEPTED_TYPES.join(',')

export type ImageFileError = 'invalid-type' | 'too-large'

type UseImageDropzoneOptions = {
  maxBytes: MaybeRefOrGetter<number>
  // Invoked with a validated File once the user drops or picks one.
  onFile: (file: File) => void
}

/**
 * File-input + drag-and-drop plumbing for an image upload surface, with no
 * knowledge of where the file ends up — the consumer supplies `onFile`.
 *
 * Validation (accepted MIME types + `maxBytes`) runs before `onFile` fires;
 * a rejected file sets `error` and skips the callback. Dragging is tracked
 * with an enter/leave counter so `dragging` doesn't flicker as the pointer
 * crosses child elements of the drop target.
 *
 * @example
 * const { dragging, onDrop, browse, fileInput } = useImageDropzone({
 *   maxBytes: MAX,
 *   onFile: (file) => upload(file)
 * })
 */
export function useImageDropzone({ maxBytes, onFile }: UseImageDropzoneOptions) {
  const fileInput = ref<HTMLInputElement | null>(null)
  const drag_counter = ref(0)
  const error = ref<ImageFileError | null>(null)

  const dragging = computed(() => drag_counter.value > 0)

  /** Open the native file picker. */
  function browse() {
    fileInput.value?.click()
  }

  function onFileChange(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (file) processFile(file)

    // Reset so re-picking the same file fires `change` again.
    input.value = ''
  }

  function onDragEnter(e: DragEvent) {
    e.preventDefault()
    error.value = null
    drag_counter.value++
  }

  function onDragLeave(e: DragEvent) {
    e.preventDefault()
    drag_counter.value--
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault()
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    drag_counter.value = 0

    const file = e.dataTransfer?.files[0]
    if (file) processFile(file)
  }

  // Validate, then either record the error or hand the file to the consumer.
  function processFile(file: File) {
    const file_error = fileError(file)
    if (file_error) {
      error.value = file_error
      return
    }

    error.value = null
    onFile(file)
  }

  function fileError(file: File): ImageFileError | null {
    if (!ACCEPTED_TYPES.includes(file.type)) return 'invalid-type'
    if (file.size > toValue(maxBytes)) return 'too-large'
    return null
  }

  return {
    accept: ACCEPT_ATTR,
    fileInput,
    dragging,
    error,
    browse,
    onFileChange,
    onDragEnter,
    onDragLeave,
    onDragOver,
    onDrop
  }
}
