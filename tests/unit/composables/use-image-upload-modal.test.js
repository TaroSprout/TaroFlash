import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { flushPromises } from '@vue/test-utils'
import { useImageUploadModal } from '@/composables/modals/use-image-upload-modal'

const { mockEmitSfx, mockOpen } = vi.hoisted(() => ({
  mockEmitSfx: vi.fn(),
  mockOpen: vi.fn()
}))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))
vi.mock('@/composables/modal', () => ({
  useModal: vi.fn(() => ({ open: mockOpen }))
}))

// useImageUploadModal wraps the component with defineAsyncComponent; assert on shape.
const asyncComponentMatcher = expect.objectContaining({ __asyncLoader: expect.any(Function) })

function makeModalResult(value) {
  return { response: Promise.resolve(value) }
}

describe('useImageUploadModal', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
    mockOpen.mockReset()
  })

  test('opens with backdrop and mobile-sheet mode', () => {
    mockOpen.mockReturnValueOnce(makeModalResult(undefined))

    useImageUploadModal().open()

    expect(mockOpen).toHaveBeenCalledWith(
      asyncComponentMatcher,
      expect.objectContaining({ backdrop: true, mode: 'mobile-sheet' })
    )
  })

  test('forwards max_bytes as a prop to the opened modal', () => {
    const max_bytes = 2 * 1024 * 1024
    mockOpen.mockReturnValueOnce(makeModalResult(undefined))

    useImageUploadModal().open({ max_bytes })

    expect(mockOpen).toHaveBeenCalledWith(
      asyncComponentMatcher,
      expect.objectContaining({ props: { max_bytes } })
    )
  })

  test('open() with no options passes an empty props object', () => {
    mockOpen.mockReturnValueOnce(makeModalResult(undefined))

    useImageUploadModal().open()

    expect(mockOpen).toHaveBeenCalledWith(
      asyncComponentMatcher,
      expect.objectContaining({ props: {} })
    )
  })

  test('plays the open sfx when called', () => {
    mockOpen.mockReturnValueOnce(makeModalResult(undefined))

    useImageUploadModal().open()

    expect(mockEmitSfx).toHaveBeenCalledWith('ui.alert_clicks_wooden')
  })

  test('returns the modal result object so callers can await .response', () => {
    const handle = makeModalResult(new File(['x'], 'img.png', { type: 'image/png' }))
    mockOpen.mockReturnValueOnce(handle)

    const returned = useImageUploadModal().open({ max_bytes: 5_000_000 })

    expect(returned).toBe(handle)
  })

  test('.response resolves with the File when the user confirms', async () => {
    const file = new File(['x'], 'photo.png', { type: 'image/png' })
    mockOpen.mockReturnValueOnce(makeModalResult(file))

    const { response } = useImageUploadModal().open()
    const result = await response

    expect(result).toBe(file)
  })

  test('.response resolves with undefined when the user dismisses', async () => {
    mockOpen.mockReturnValueOnce(makeModalResult(undefined))

    const { response } = useImageUploadModal().open()
    const result = await response

    expect(result).toBeUndefined()
  })

  test('plays the close sfx after the modal resolves', async () => {
    mockOpen.mockReturnValueOnce(makeModalResult(undefined))

    useImageUploadModal().open()
    const openSfxCount = mockEmitSfx.mock.calls.length

    await flushPromises()

    expect(mockEmitSfx.mock.calls.length).toBeGreaterThan(openSfxCount)
    expect(mockEmitSfx).toHaveBeenLastCalledWith('ui.pop_up_close')
  })
})
