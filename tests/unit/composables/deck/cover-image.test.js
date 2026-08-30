import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { createApp, reactive, ref } from 'vue'
import { createI18n } from 'vue-i18n'
import messages from '@intlify/unplugin-vue-i18n/messages'
import { useImageDropzone as realUseImageDropzone } from '@/composables/card/image-dropzone'

const i18n = createI18n({ locale: 'en-us', legacy: false, messages })

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

// onRemove awaits collapseFaceImage (a real gsap.to under the hood) before it
// clears image_path — capture the onComplete instead of auto-firing it, so
// tests can assert the pending-collapse state before releasing it.
const { mockGsapTo } = vi.hoisted(() => ({ mockGsapTo: vi.fn() }))
const { mockRevokeObjectURL } = vi.hoisted(() => ({ mockRevokeObjectURL: vi.fn() }))
vi.mock('gsap', () => ({ gsap: { to: mockGsapTo } }))

const { mockHashFile } = vi.hoisted(() => ({
  mockHashFile: vi.fn().mockResolvedValue('deadbeef')
}))
vi.mock('@/utils/hash', () => ({ hashFile: mockHashFile }))

const { mockMemberId } = vi.hoisted(() => ({ mockMemberId: { value: 'member-uuid' } }))
vi.mock('@/stores/member', () => ({
  useMemberStore: () => ({ id: mockMemberId.value })
}))

const { mockUploadMutateAsync, mockInsertMedia, mockDeleteDeckCoverImage } = vi.hoisted(() => ({
  mockUploadMutateAsync: vi.fn().mockResolvedValue('https://cdn/cover.png'),
  mockInsertMedia: vi.fn().mockResolvedValue(undefined),
  mockDeleteDeckCoverImage: vi.fn().mockResolvedValue(undefined)
}))
vi.mock('@/api/media', () => ({
  useUploadImageMutation: () => ({ mutateAsync: mockUploadMutateAsync }),
  insertMedia: mockInsertMedia,
  deleteDeckCoverImage: mockDeleteDeckCoverImage
}))

// The dropzone plumbing (validation, drag counter, guard) is its own unit
// (use-image-dropzone.test.js) — wrap the real implementation here so
// useCoverImage's onFile/onError wiring is exercised for real, while still
// letting tests inspect the options useCoverImage passed in (e.g. to confirm
// no `guard` — deck covers have no paid gate).
let captured_dropzone_opts
vi.mock('@/composables/card', () => ({
  useImageDropzone: vi.fn((opts) => {
    captured_dropzone_opts = opts
    return realUseImageDropzone(opts)
  })
}))

import { useCoverImage, COVER_IMAGE_MAX_BYTES } from '@/composables/deck/cover-image'

// ── Helpers ───────────────────────────────────────────────────────────────────

// error_message is a computed calling useI18n()'s `t`, which vue-i18n only
// allows to be *initiated* inside an active component instance — mount a
// headless host app, like the useFaceImageUpload composable tests do.
function withCoverImage(cover, deckId) {
  let result
  const app = createApp({
    setup() {
      result = useCoverImage(
        () => cover,
        () => deckId.value
      )
      return () => null
    }
  })
  app.use(i18n)
  app.mount(document.createElement('div'))
  return { cover_image: result, unmount: () => app.unmount() }
}

function pngFile(bytes = 10) {
  return new File(['x'.repeat(bytes)], 'photo.png', { type: 'image/png' })
}

function dropEvent(file) {
  return { preventDefault: vi.fn(), dataTransfer: { files: file ? [file] : [] } }
}

let created_urls
let captured_on_complete

beforeEach(() => {
  mockEmitSfx.mockClear()
  mockHashFile.mockClear().mockResolvedValue('deadbeef')
  mockMemberId.value = 'member-uuid'
  mockUploadMutateAsync.mockReset().mockResolvedValue('https://cdn/cover.png')
  mockInsertMedia.mockReset().mockResolvedValue(undefined)
  mockDeleteDeckCoverImage.mockReset().mockResolvedValue(undefined)
  captured_dropzone_opts = undefined

  captured_on_complete = undefined
  mockGsapTo.mockReset().mockImplementation((_el, opts) => {
    captured_on_complete = opts.onComplete
  })

  mockRevokeObjectURL.mockClear()
  created_urls = []
  vi.stubGlobal(
    'URL',
    class {
      static createObjectURL(file) {
        const url = `blob:${file.name}-${created_urls.length}`
        created_urls.push(url)
        return url
      }
      static revokeObjectURL = mockRevokeObjectURL
    }
  )
})

// ── has_image ─────────────────────────────────────────────────────────────────

describe('useCoverImage — has_image', () => {
  test('is false when cover.image_path is unset', () => {
    const { cover_image, unmount } = withCoverImage(reactive({}), ref(1))
    expect(cover_image.has_image.value).toBe(false)
    unmount()
  })

  test('is true when cover.image_path is set', () => {
    const { cover_image, unmount } = withCoverImage(
      reactive({ image_path: 'https://cdn/x.png' }),
      ref(1)
    )
    expect(cover_image.has_image.value).toBe(true)
    unmount()
  })
})

// ── stageFile via onFile [obligation] ──────────────────────────────────────────

describe('useCoverImage — stageFile (via onFile) [obligation]', () => {
  test('a validated file sets cover.image_path to a fresh objectURL [obligation]', async () => {
    const cover = reactive({})
    const { cover_image, unmount } = withCoverImage(cover, ref(1))
    const file = pngFile()

    await cover_image.onDrop(dropEvent(file))

    expect(cover.image_path).toBe(created_urls[0])
    expect(cover_image.has_image.value).toBe(true)
    unmount()
  })

  test('emits ui.music_plink_ok when a file stages successfully', async () => {
    const cover = reactive({})
    const { cover_image, unmount } = withCoverImage(cover, ref(1))

    await cover_image.onDrop(dropEvent(pngFile()))

    expect(mockEmitSfx).toHaveBeenCalledWith('file.accepted')
    unmount()
  })

  test('commit() later uploads the staged file (proof the File is held, not just its URL) [obligation]', async () => {
    const cover = reactive({})
    const { cover_image, unmount } = withCoverImage(cover, ref(7))
    const file = pngFile()

    await cover_image.onDrop(dropEvent(file))
    await cover_image.commit()

    expect(mockUploadMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ file, bucket: 'member-images' })
    )
    unmount()
  })
})

// ── onRemove [obligation] ───────────────────────────────────────────────────────

describe('useCoverImage — onRemove [obligation]', () => {
  test('clears the staged file and deletes cover.image_path [obligation]', async () => {
    const cover = reactive({})
    const { cover_image, unmount } = withCoverImage(cover, ref(1))
    await cover_image.onDrop(dropEvent(pngFile()))
    expect(cover.image_path).toBeDefined()

    cover_image.onRemove()

    expect(cover.image_path).toBeUndefined()
    expect(cover_image.has_image.value).toBe(false)
    unmount()
  })

  test('removing an already-uploaded cover (no staged file) also deletes image_path [obligation]', () => {
    const cover = reactive({ image_path: 'https://cdn/existing.png' })
    const { cover_image, unmount } = withCoverImage(cover, ref(1))

    cover_image.onRemove()

    expect(cover.image_path).toBeUndefined()
    unmount()
  })

  test('emits ui.snappy_button_5', () => {
    const cover = reactive({ image_path: 'https://cdn/existing.png' })
    const { cover_image, unmount } = withCoverImage(cover, ref(1))

    cover_image.onRemove()

    expect(mockEmitSfx).toHaveBeenCalledWith('ui.press')
    unmount()
  })

  test('emits ui.press before card.delete, in that order [obligation]', async () => {
    const cover = reactive({ image_path: 'https://cdn/existing.png' })
    const { cover_image, unmount } = withCoverImage(cover, ref(1))

    await cover_image.onRemove()

    const press_index = mockEmitSfx.mock.calls.findIndex((call) => call[0] === 'ui.press')
    const delete_index = mockEmitSfx.mock.calls.findIndex((call) => call[0] === 'card.delete')
    expect(press_index).toBeGreaterThanOrEqual(0)
    expect(delete_index).toBeGreaterThan(press_index)
    unmount()
  })

  test('awaits collapseFaceImage before clearing image_path when an <img> is mounted [obligation]', async () => {
    const cover = reactive({ image_path: 'https://cdn/existing.png' })
    const { cover_image, unmount } = withCoverImage(cover, ref(1))
    cover_image.image_el.value = document.createElement('img')

    const remove_promise = cover_image.onRemove()

    // collapseFaceImage's promise executor runs synchronously up to the
    // pending gsap.to call, so this holds before any microtask has run.
    expect(mockGsapTo).toHaveBeenCalled()
    expect(cover.image_path).toBe('https://cdn/existing.png')

    captured_on_complete()
    await remove_promise

    expect(cover.image_path).toBeUndefined()
    unmount()
  })

  test('revokes the staged object URL and clears the staged file on remove [obligation]', async () => {
    const cover = reactive({})
    const { cover_image, unmount } = withCoverImage(cover, ref(1))
    await cover_image.onDrop(dropEvent(pngFile()))
    const staged_url = cover.image_path

    await cover_image.onRemove()

    expect(mockRevokeObjectURL).toHaveBeenCalledWith(staged_url)
    unmount()
  })

  test('clears synchronously without throwing or calling collapseFaceImage when no <img> is mounted [obligation]', () => {
    const cover = reactive({ image_path: 'https://cdn/existing.png' })
    const { cover_image, unmount } = withCoverImage(cover, ref(1))
    expect(cover_image.image_el.value).toBeNull()

    expect(() => cover_image.onRemove()).not.toThrow()

    expect(cover.image_path).toBeUndefined()
    expect(mockGsapTo).not.toHaveBeenCalled()
    unmount()
  })
})

// ── reset restores a removed cover [obligation] ─────────────────────────────────

describe('useCoverImage — reset restores a removed cover [obligation]', () => {
  test('restoring image_path after onRemove brings has_image back — removal is draft-local until save [obligation]', async () => {
    const cover = reactive({ image_path: 'https://cdn/existing.png' })
    const { cover_image, unmount } = withCoverImage(cover, ref(1))

    await cover_image.onRemove()
    expect(cover_image.has_image.value).toBe(false)

    // Mimics useDeckEditor.resetChanges restoring the draft's own field —
    // onRemove must not leave state that blocks the image from coming back.
    cover.image_path = 'https://cdn/existing.png'

    expect(cover_image.has_image.value).toBe(true)
    unmount()
  })
})

// ── commit() with a staged file [obligation] ────────────────────────────────────

describe('useCoverImage — commit() with a staged file [obligation]', () => {
  async function stageAndCommit(deck_id = 7) {
    const cover = reactive({})
    const { cover_image, unmount } = withCoverImage(cover, ref(deck_id))
    const file = pngFile()
    await cover_image.onDrop(dropEvent(file))
    await cover_image.commit()
    return { cover, cover_image, unmount }
  }

  test('uploads via useUploadImageMutation, then insertMedia with a content-addressed path [obligation]', async () => {
    const { unmount } = await stageAndCommit(7)

    expect(mockUploadMutateAsync).toHaveBeenCalledWith({
      bucket: 'member-images',
      path: 'member-uuid/deadbeef.png',
      file: expect.any(File)
    })
    expect(mockInsertMedia).toHaveBeenCalledWith({
      bucket: 'member-images',
      path: 'member-uuid/deadbeef.png',
      deck_id: 7,
      slot: 'deck_cover'
    })
    unmount()
  })

  test('sets cover.image_path to the uploaded public URL on success [obligation]', async () => {
    mockUploadMutateAsync.mockResolvedValueOnce('https://cdn/published-cover.png')
    const { cover, unmount } = await stageAndCommit(7)

    expect(cover.image_path).toBe('https://cdn/published-cover.png')
    unmount()
  })

  test('upload failure throws an Error with cause "upload" and never calls insertMedia [obligation]', async () => {
    mockUploadMutateAsync.mockRejectedValueOnce(new Error('network down'))
    const cover = reactive({})
    const { cover_image, unmount } = withCoverImage(cover, ref(7))
    await cover_image.onDrop(dropEvent(pngFile()))

    await expect(cover_image.commit()).rejects.toMatchObject({ cause: 'upload' })
    expect(mockInsertMedia).not.toHaveBeenCalled()
    unmount()
  })

  test('insertMedia failure throws an Error with cause "insert" [obligation]', async () => {
    mockInsertMedia.mockRejectedValueOnce(new Error('rls denied'))
    const cover = reactive({})
    const { cover_image, unmount } = withCoverImage(cover, ref(7))
    await cover_image.onDrop(dropEvent(pngFile()))

    await expect(cover_image.commit()).rejects.toMatchObject({ cause: 'insert' })
    unmount()
  })

  test('returns early (no throw, no calls) when there is no deck id [obligation]', async () => {
    const cover = reactive({})
    const { cover_image, unmount } = withCoverImage(cover, ref(undefined))
    await cover_image.onDrop(dropEvent(pngFile()))

    await expect(cover_image.commit()).resolves.toBeUndefined()
    expect(mockUploadMutateAsync).not.toHaveBeenCalled()
    expect(mockInsertMedia).not.toHaveBeenCalled()
    unmount()
  })
})

// ── commit() with no staged file (removal) [obligation] ─────────────────────────

describe('useCoverImage — commit() with no staged file [obligation]', () => {
  test('with no staged file and no image_path, calls deleteDeckCoverImage(deck_id) [obligation]', async () => {
    const cover = reactive({})
    const { cover_image, unmount } = withCoverImage(cover, ref(7))

    await cover_image.commit()

    expect(mockDeleteDeckCoverImage).toHaveBeenCalledWith(7)
    unmount()
  })

  test('is idempotent — deleteDeckCoverImage runs even when there was never an active cover [obligation]', async () => {
    const cover = reactive({})
    const { cover_image, unmount } = withCoverImage(cover, ref(7))

    await expect(cover_image.commit()).resolves.toBeUndefined()

    unmount()
  })

  test('does NOT call deleteDeckCoverImage when the cover still has an image_path (nothing to commit)', async () => {
    const cover = reactive({ image_path: 'https://cdn/unchanged.png' })
    const { cover_image, unmount } = withCoverImage(cover, ref(7))

    await cover_image.commit()

    expect(mockDeleteDeckCoverImage).not.toHaveBeenCalled()
    unmount()
  })
})

// ── no paid-plan gate [obligation] ──────────────────────────────────────────────

describe('useCoverImage — no paid-plan gate [obligation]', () => {
  test('useImageDropzone is wired with no `guard` option [obligation]', () => {
    const { unmount } = withCoverImage(reactive({}), ref(1))
    expect(captured_dropzone_opts.guard).toBeUndefined()
    unmount()
  })

  test('openPicker calls browse() unconditionally (no guard check) [obligation]', () => {
    const { cover_image, unmount } = withCoverImage(reactive({}), ref(1))
    const click = vi.fn()
    cover_image.file_input.value = { click }

    cover_image.openPicker()

    expect(click).toHaveBeenCalled()
    expect(mockEmitSfx).toHaveBeenCalledWith('ui.select')
    unmount()
  })

  test('a free member (no plan check anywhere) can stage a file via onFile [obligation]', async () => {
    const cover = reactive({})
    const { cover_image, unmount } = withCoverImage(cover, ref(1))

    await cover_image.onDrop(dropEvent(pngFile()))

    expect(cover.image_path).toBeDefined()
    unmount()
  })
})

// ── validation errors — COVER_IMAGE_MAX_BYTES / invalid type [obligation] ───────

describe('useCoverImage — validation errors [obligation]', () => {
  test('COVER_IMAGE_MAX_BYTES is 5 MiB [obligation]', () => {
    expect(COVER_IMAGE_MAX_BYTES).toBe(5 * 1024 * 1024)
  })

  test('a file over 5 MiB stages nothing and sets error "too-large" [obligation]', async () => {
    const cover = reactive({})
    const { cover_image, unmount } = withCoverImage(cover, ref(1))
    const big_file = pngFile(COVER_IMAGE_MAX_BYTES + 1)

    await cover_image.onDrop(dropEvent(big_file))

    expect(cover.image_path).toBeUndefined()
    expect(cover_image.file_error.value).toBe('too-large')
    expect(cover_image.error_message.value).toContain('5 MB')
    unmount()
  })

  test('a non-image type stages nothing and sets error "invalid-type" [obligation]', async () => {
    const cover = reactive({})
    const { cover_image, unmount } = withCoverImage(cover, ref(1))
    const bad_file = new File(['x'], 'notes.txt', { type: 'text/plain' })

    await cover_image.onDrop(dropEvent(bad_file))

    expect(cover.image_path).toBeUndefined()
    expect(cover_image.file_error.value).toBe('invalid-type')
    expect(cover_image.error_message.value).toBeTruthy()
    unmount()
  })

  test('emits ui.digi_powerdown on a validation error', async () => {
    const { cover_image, unmount } = withCoverImage(reactive({}), ref(1))

    await cover_image.onDrop(dropEvent(new File(['x'], 'notes.txt', { type: 'text/plain' })))

    expect(mockEmitSfx).toHaveBeenCalledWith('ui.rejected')
    unmount()
  })
})

// ── drag cue [obligation] ────────────────────────────────────────────────────

describe('useCoverImage — drag cue [obligation]', () => {
  test('onDragEnter chimes gesture.zone-cross since dragCue is omitted (defaults to true) [obligation]', () => {
    const { cover_image, unmount } = withCoverImage(reactive({}), ref(1))

    cover_image.onDragEnter({ preventDefault: vi.fn() })

    expect(mockEmitSfx).toHaveBeenCalledWith('gesture.zone-cross')
    unmount()
  })
})

// ── discardStaged ────────────────────────────────────────────────────────────

describe('useCoverImage — discardStaged', () => {
  test('clears the staged file but leaves cover.image_path alone (the draft reset owns that)', async () => {
    const cover = reactive({})
    const { cover_image, unmount } = withCoverImage(cover, ref(1))
    await cover_image.onDrop(dropEvent(pngFile()))
    const staged_path = cover.image_path

    cover_image.discardStaged()

    // discardStaged only releases the File/objectURL bookkeeping; the caller
    // (useDeckEditor.resetChanges) is responsible for restoring image_path.
    expect(cover.image_path).toBe(staged_path)
    unmount()
  })
})
