import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { useImageDropzone } from '@/composables/card-editor/use-image-dropzone'

const MAX_BYTES = 1024

let onFile
let onError

function setup(maxBytes = MAX_BYTES) {
  onFile = vi.fn()
  onError = vi.fn()
  return useImageDropzone({ maxBytes, onFile, onError })
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

  test('browse clicks the bound file input', () => {
    const dz = setup()
    const click = vi.fn()
    dz.fileInput.value = { click }
    dz.browse()
    expect(click).toHaveBeenCalled()
  })
})
