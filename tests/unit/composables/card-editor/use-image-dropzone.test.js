import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { ref } from 'vue'
import { useImageDropzone } from '@/composables/card-editor/use-image-dropzone'

const MAX_BYTES = 1024

let onFile
let onError
let fileInput

function setup(maxBytes = MAX_BYTES) {
  onFile = vi.fn()
  onError = vi.fn()
  fileInput = ref(null)
  return useImageDropzone({ maxBytes, fileInput, onFile, onError })
}

function setupWithGuard(guard, maxBytes = MAX_BYTES) {
  onFile = vi.fn()
  onError = vi.fn()
  fileInput = ref(null)
  return useImageDropzone({ maxBytes, fileInput, onFile, onError, guard })
}

function pngFile(bytes = 1) {
  return new File(['x'.repeat(bytes)], 'a.png', { type: 'image/png' })
}

// vue-test-utils isn't involved here — fabricate minimal drag/change events.
function dropEvent(file) {
  return { preventDefault: vi.fn(), dataTransfer: { files: file ? [file] : [] } }
}

beforeEach(() => {
  onFile = undefined
  onError = undefined
  fileInput = undefined
})

describe('useImageDropzone', () => {
  // ── Drag counter ───────────────────────────────────────────────────────────

  test('dragging stays true while a child enter/leave pair nets positive', () => {
    const dz = setup()
    dz.onDragEnter(dropEvent())
    dz.onDragEnter(dropEvent())
    dz.onDragLeave(dropEvent())
    expect(dz.dragging.value).toBe(true)

    dz.onDragLeave(dropEvent())
    expect(dz.dragging.value).toBe(false)
  })

  test('onDrop resets the counter so dragging clears even after nested enters', () => {
    const dz = setup()
    dz.onDragEnter(dropEvent())
    dz.onDragEnter(dropEvent())
    dz.onDrop(dropEvent(pngFile()))
    expect(dz.dragging.value).toBe(false)
  })

  // ── Validation + callback ────────────────────────────────────────────────────

  test('a valid dropped file clears error and invokes onFile, not onError', () => {
    const dz = setup()
    const file = pngFile()
    dz.onDrop(dropEvent(file))

    expect(dz.error.value).toBe(null)
    expect(onFile).toHaveBeenCalledWith(file)
    expect(onError).not.toHaveBeenCalled()
  })

  test('a wrong-type file sets invalid-type, skips onFile, and invokes onError', () => {
    const dz = setup()
    dz.onDrop(dropEvent(new File(['x'], 'a.txt', { type: 'text/plain' })))

    expect(dz.error.value).toBe('invalid-type')
    expect(onFile).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledWith('invalid-type')
  })

  test('an oversized file sets too-large and skips onFile', () => {
    const dz = setup(0)
    dz.onDrop(dropEvent(pngFile()))

    expect(dz.error.value).toBe('too-large')
    expect(onFile).not.toHaveBeenCalled()
  })

  test('a fresh dragenter clears a prior error', () => {
    const dz = setup()
    dz.onDrop(dropEvent(new File(['x'], 'a.txt', { type: 'text/plain' })))
    expect(dz.error.value).toBe('invalid-type')

    dz.onDragEnter(dropEvent())
    expect(dz.error.value).toBe(null)
  })

  // ── File input ───────────────────────────────────────────────────────────────

  test('onFileChange validates the picked file and resets the input value', () => {
    const dz = setup()
    const file = pngFile()
    const input = { files: [file], value: 'C:/fakepath/a.png' }
    dz.onFileChange({ target: input })

    expect(onFile).toHaveBeenCalledWith(file)
    expect(input.value).toBe('')
  })

  test('browse clicks the consumer-provided file input', () => {
    const dz = setup()
    const click = vi.fn()
    fileInput.value = { click }
    dz.browse()
    expect(click).toHaveBeenCalled()
  })

  // ── clearError ─────────────────────────────────────────────────────────────

  test('clearError resets error to null', () => {
    const dz = setup()
    dz.onDrop(dropEvent(new File(['x'], 'a.txt', { type: 'text/plain' })))
    expect(dz.error.value).toBe('invalid-type')

    dz.clearError()
    expect(dz.error.value).toBe(null)
  })

  test('clearError is a no-op when error is already null', () => {
    const dz = setup()
    expect(dz.error.value).toBe(null)
    dz.clearError()
    expect(dz.error.value).toBe(null)
  })

  // ── drag_counter flicker protection ───────────────────────────────────────

  test('enter/enter/leave keeps dragging true (flicker-proof)', () => {
    const dz = setup()
    dz.onDragEnter(dropEvent())
    dz.onDragEnter(dropEvent())
    dz.onDragLeave(dropEvent())
    expect(dz.dragging.value).toBe(true)

    dz.onDragLeave(dropEvent())
    expect(dz.dragging.value).toBe(false)
  })

  // ── onFileChange input reset ───────────────────────────────────────────────

  test('onFileChange resets input.value so re-picking the same file refires', () => {
    const dz = setup()
    const file = pngFile()
    const input = { files: [file], value: 'C:/fakepath/a.png' }
    dz.onFileChange({ target: input })

    expect(input.value).toBe('')
  })

  // ── onError callback ───────────────────────────────────────────────────────

  test('onError is called with the failure code on an invalid file', () => {
    const dz = setup()
    dz.onDrop(dropEvent(new File(['x'], 'a.txt', { type: 'text/plain' })))
    expect(onError).toHaveBeenCalledWith('invalid-type')
  })

  test('onError is NOT called on a valid file', () => {
    const dz = setup()
    dz.onDrop(dropEvent(pngFile()))
    expect(onError).not.toHaveBeenCalled()
  })

  test('onFile is NOT called on an invalid file', () => {
    const dz = setup()
    dz.onDrop(dropEvent(new File(['x'], 'a.txt', { type: 'text/plain' })))
    expect(onFile).not.toHaveBeenCalled()
  })

  // ── guard ────────────────────────────────────────────────────────────────

  test('a passing guard lets a valid drop reach onFile', async () => {
    const guard = vi.fn().mockResolvedValue(true)
    const dz = setupWithGuard(guard)
    const file = pngFile()

    await dz.onDrop(dropEvent(file))

    expect(guard).toHaveBeenCalled()
    expect(onFile).toHaveBeenCalledWith(file)
  })

  test('a blocking guard abandons the drop before validation runs', async () => {
    const guard = vi.fn().mockResolvedValue(false)
    const dz = setupWithGuard(guard)

    // An invalid file: if validation ran it would set an error / call onError.
    await dz.onDrop(dropEvent(new File(['x'], 'a.txt', { type: 'text/plain' })))

    expect(guard).toHaveBeenCalled()
    expect(onFile).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
    expect(dz.error.value).toBe(null)
  })

  test('the drag counter still resets when the guard blocks', async () => {
    const dz = setupWithGuard(vi.fn().mockResolvedValue(false))
    dz.onDragEnter(dropEvent())

    await dz.onDrop(dropEvent(pngFile()))

    expect(dz.dragging.value).toBe(false)
  })
})
