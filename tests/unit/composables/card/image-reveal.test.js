import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowRef, nextTick } from 'vue'
import { useImageReveal } from '@/composables/card/image-reveal'

const revealFaceImageMock = vi.fn()
vi.mock('@/utils/animations/face-image', () => ({
  revealFaceImage: (...args) => revealFaceImageMock(...args)
}))

function makeImg(overrides = {}) {
  return {
    complete: false,
    naturalWidth: 0,
    decode: vi.fn().mockResolvedValue(undefined),
    ...overrides
  }
}

describe('useImageReveal', () => {
  beforeEach(() => {
    revealFaceImageMock.mockReset()
  })

  test('decoded stays false when the source is falsy', () => {
    const imgRef = shallowRef(makeImg())
    const { decoded } = useImageReveal(() => undefined, imgRef)
    expect(decoded.value).toBe(false)
  })

  test('decodes and reveals a normal, not-yet-loaded image', async () => {
    const img = makeImg()
    const imgRef = shallowRef(img)
    const { decoded } = useImageReveal(() => 'src.png', imgRef)

    await vi.waitFor(() => expect(decoded.value).toBe(true))
    expect(img.decode).toHaveBeenCalled()
    expect(revealFaceImageMock).toHaveBeenCalledWith(img)
  })

  test('decoded becomes true without calling decode() when the img is already loaded, even if decode() would reject', async () => {
    const img = makeImg({
      complete: true,
      naturalWidth: 10,
      decode: vi.fn().mockRejectedValue(new Error('AbortError'))
    })
    const imgRef = shallowRef(img)
    const { decoded } = useImageReveal(() => 'src.png', imgRef)

    await vi.waitFor(() => expect(decoded.value).toBe(true))
    expect(img.decode).not.toHaveBeenCalled()
    expect(revealFaceImageMock).toHaveBeenCalledWith(img)
  })

  test('decoded stays false when decode() rejects and the image never finishes loading', async () => {
    const img = makeImg({ decode: vi.fn().mockRejectedValue(new Error('src changed mid-flight')) })
    const imgRef = shallowRef(img)
    const { decoded } = useImageReveal(() => 'src.png', imgRef)

    await vi.waitFor(() => expect(img.decode).toHaveBeenCalled())
    await nextTick()
    await nextTick()

    expect(decoded.value).toBe(false)
    expect(revealFaceImageMock).not.toHaveBeenCalled()
  })

  test('resets decoded to false when the source becomes falsy again', async () => {
    const source = shallowRef('src.png')
    const imgRef = shallowRef(makeImg())
    const { decoded } = useImageReveal(() => source.value, imgRef)

    await vi.waitFor(() => expect(decoded.value).toBe(true))

    source.value = undefined
    await nextTick()

    expect(decoded.value).toBe(false)
  })

  test('is a no-op when the img ref is not yet attached', async () => {
    const imgRef = shallowRef(null)
    const { decoded } = useImageReveal(() => 'src.png', imgRef)

    await nextTick()
    await nextTick()

    expect(decoded.value).toBe(false)
  })
})
