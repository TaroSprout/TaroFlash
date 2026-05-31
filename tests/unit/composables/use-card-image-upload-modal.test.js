import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { flushPromises } from '@vue/test-utils'
import { useCardImageUploadModal } from '@/composables/modals/use-card-image-upload-modal'

const { mockEmitSfx, mockOpen } = vi.hoisted(() => ({
  mockEmitSfx: vi.fn(),
  mockOpen: vi.fn()
}))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))
vi.mock('@/composables/modal', () => ({
  useModal: vi.fn(() => ({ open: mockOpen }))
}))

// useCardImageUploadModal wraps the component with defineAsyncComponent; assert
// on shape rather than identity.
const asyncComponentMatcher = expect.objectContaining({ __asyncLoader: expect.any(Function) })

function makeModalResult(value) {
  return { response: Promise.resolve(value) }
}

describe('useCardImageUploadModal', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
    mockOpen.mockReset()
  })

  test('opens with backdrop and mobile-sheet mode', () => {
    mockOpen.mockReturnValueOnce(makeModalResult(undefined))

    useCardImageUploadModal().open({ target: 'faces' })

    expect(mockOpen).toHaveBeenCalledWith(
      asyncComponentMatcher,
      expect.objectContaining({ backdrop: true, mode: 'mobile-sheet' })
    )
  })

  test('forwards all options as props to the opened modal', () => {
    const options = {
      target: 'faces',
      max_bytes: 2 * 1024 * 1024,
      front_image: 'https://example.com/front.png',
      back_image: 'https://example.com/back.png'
    }
    mockOpen.mockReturnValueOnce(makeModalResult(undefined))

    useCardImageUploadModal().open(options)

    expect(mockOpen).toHaveBeenCalledWith(
      asyncComponentMatcher,
      expect.objectContaining({ props: options })
    )
  })

  test('cover target with cover_image is forwarded correctly', () => {
    const options = { target: 'cover', cover_image: 'https://example.com/cover.png' }
    mockOpen.mockReturnValueOnce(makeModalResult(undefined))

    useCardImageUploadModal().open(options)

    expect(mockOpen).toHaveBeenCalledWith(
      asyncComponentMatcher,
      expect.objectContaining({ props: options })
    )
  })

  test('plays the open sfx when called', () => {
    mockOpen.mockReturnValueOnce(makeModalResult(undefined))

    useCardImageUploadModal().open({ target: 'faces' })

    expect(mockEmitSfx).toHaveBeenCalledWith('ui.alert_clicks_wooden')
  })

  test('returns the modal result object so callers can await .response', () => {
    const handle = makeModalResult({ target: 'faces', front: null, back: undefined })
    mockOpen.mockReturnValueOnce(handle)

    const returned = useCardImageUploadModal().open({ target: 'faces' })

    expect(returned).toBe(handle)
  })

  test('.response resolves with the faces response when the user confirms', async () => {
    const file = new File(['x'], 'photo.png', { type: 'image/png' })
    const response_value = { target: 'faces', front: file, back: null }
    mockOpen.mockReturnValueOnce(makeModalResult(response_value))

    const { response } = useCardImageUploadModal().open({ target: 'faces' })
    const result = await response

    expect(result).toBe(response_value)
  })

  test('.response resolves with undefined when the user dismisses', async () => {
    mockOpen.mockReturnValueOnce(makeModalResult(undefined))

    const { response } = useCardImageUploadModal().open({ target: 'cover' })
    const result = await response

    expect(result).toBeUndefined()
  })

  test('plays the close sfx after the modal resolves', async () => {
    mockOpen.mockReturnValueOnce(makeModalResult(undefined))

    useCardImageUploadModal().open({ target: 'faces' })
    const openSfxCount = mockEmitSfx.mock.calls.length

    await flushPromises()

    expect(mockEmitSfx.mock.calls.length).toBeGreaterThan(openSfxCount)
    expect(mockEmitSfx).toHaveBeenLastCalledWith('ui.pop_up_close')
  })
})
