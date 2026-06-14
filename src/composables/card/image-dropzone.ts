import { computed, ref, toValue, type MaybeRefOrGetter, type ShallowRef } from 'vue'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const ACCEPT_ATTR = ACCEPTED_TYPES.join(',')

export type ImageFileError = 'invalid-type' | 'too-large'

type UseImageDropzoneOptions = {
  maxBytes: MaybeRefOrGetter<number>
  // Template ref to the hidden <input type="file">, owned by the consumer.
  fileInput: Readonly<ShallowRef<HTMLInputElement | null>>
  // Invoked with a validated File once the user drops or picks one.
  onFile: (file: File) => void
  // Invoked when a dropped/picked file fails validation.
  onError?: (error: ImageFileError) => void
  // Precondition checked on drop before validation. When it resolves false the
  // drop is abandoned (e.g. a feature gate showed its own prompt instead).
  guard?: () => boolean | Promise<boolean>
}

/**
 * File-input + drag-and-drop plumbing for an image upload surface, with no
 * knowledge of where the file ends up — the consumer supplies `onFile` and the
 * `fileInput` template ref.
 *
 * Validation (accepted MIME types + `maxBytes`) runs before `onFile` fires;
 * a rejected file sets `error` and skips the callback. Dragging is tracked
 * with an enter/leave counter so `dragging` doesn't flicker as the pointer
 * crosses child elements of the drop target.
 *
 * @example
 * const fileInput = useTemplateRef('fileInput')
 * const { dragging, onDrop, browse } = useImageDropzone({
 *   maxBytes: MAX,
 *   fileInput,
 *   onFile: (file) => upload(file)
 * })
 */
export function useImageDropzone({
  maxBytes,
  fileInput,
  onFile,
  onError,
  guard
}: UseImageDropzoneOptions) {
  const drag_counter = ref(0)
  const error = ref<ImageFileError | null>(null)

  const dragging = computed(() => drag_counter.value > 0)

  /** Clear any validation error. */
  function clearError() {
    error.value = null
  }

  /** Open the native file picker. */
  function browse() {
    fileInput.value?.click()
  }

  /** Validate a file picked via the input, then reset it so re-picking refires. */
  function onFileChange(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (file) processFile(file)

    // Reset so re-picking the same file fires `change` again.
    input.value = ''
  }

  /** Track a drag entering the drop target; clears any prior error. */
  function onDragEnter(e: DragEvent) {
    e.preventDefault()
    clearError()
    drag_counter.value++
  }

  /** Track a drag leaving the drop target. */
  function onDragLeave(e: DragEvent) {
    e.preventDefault()
    drag_counter.value--
  }

  /** Allow dropping by preventing the browser's default navigate-to-file. */
  function onDragOver(e: DragEvent) {
    e.preventDefault()
  }

  /** Accept a dropped file and validate it, unless `guard` vetoes the drop. */
  async function onDrop(e: DragEvent) {
    e.preventDefault()
    drag_counter.value = 0

    // Capture the file before any await — `dataTransfer` is cleared once the
    // event handler yields.
    const file = e.dataTransfer?.files[0]
    if (!file) return

    if (guard && !(await guard())) return
    processFile(file)
  }

  // Validate, then either record the error or hand the file to the consumer.
  function processFile(file: File) {
    const file_error = fileError(file)
    if (file_error) {
      error.value = file_error
      onError?.(file_error)
      return
    }

    clearError()
    onFile(file)
  }

  function fileError(file: File): ImageFileError | null {
    if (!ACCEPTED_TYPES.includes(file.type)) return 'invalid-type'
    if (file.size > toValue(maxBytes)) return 'too-large'
    return null
  }

  return {
    accept: ACCEPT_ATTR,
    dragging,
    error,
    clearError,
    browse,
    onFileChange,
    onDragEnter,
    onDragLeave,
    onDragOver,
    onDrop
  }
}
