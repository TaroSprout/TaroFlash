import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { useAlert } from '@/composables/alert'

const { mockOpen } = vi.hoisted(() => ({ mockOpen: vi.fn() }))

vi.mock('@/composables/overlay/use-overlay', () => ({
  useOverlay: vi.fn(() => ({ open: mockOpen }))
}))

// alert.vue is imported directly by the composable, so match by shape rather
// than identity.
const anyComponent = expect.anything()

function makeOverlayResult() {
  return { result: Promise.resolve(undefined), close: vi.fn() }
}

describe('useAlert', () => {
  beforeEach(() => {
    mockOpen.mockClear()
    mockOpen.mockReturnValue(makeOverlayResult())
  })

  describe('warn()', () => {
    test('opens with the default open_sfx role when openAudio is omitted', () => {
      const { warn } = useAlert()
      warn({ title: 'Are you sure?' })
      expect(mockOpen).toHaveBeenCalledWith(
        anyComponent,
        expect.objectContaining({ open_sfx: 'notice.error' })
      )
    })

    test('opens with the provided openAudio as open_sfx when supplied', () => {
      const { warn } = useAlert()
      warn({ title: 'x', openAudio: 'slide_up' })
      expect(mockOpen).toHaveBeenCalledWith(
        anyComponent,
        expect.objectContaining({ open_sfx: 'slide_up' })
      )
    })

    test('passes default cancelAudio to the alert component when cancelAudio is omitted', () => {
      const { warn } = useAlert()
      warn({ title: 'Are you sure?' })
      expect(mockOpen).toHaveBeenCalledWith(
        anyComponent,
        expect.objectContaining({
          props: expect.objectContaining({ cancelAudio: 'dialog.dismiss' })
        })
      )
    })

    test('passes provided cancelAudio to the alert component when supplied', () => {
      const { warn } = useAlert()
      warn({ title: 'x', cancelAudio: 'slide_up' })
      expect(mockOpen).toHaveBeenCalledWith(
        anyComponent,
        expect.objectContaining({
          props: expect.objectContaining({ cancelAudio: 'slide_up' })
        })
      )
    })

    test('opens with popup presentation', () => {
      const { warn } = useAlert()
      warn()
      expect(mockOpen).toHaveBeenCalledWith(
        anyComponent,
        expect.objectContaining({ presentation: 'popup' })
      )
    })

    test('opens with type: warn', () => {
      const { warn } = useAlert()
      warn({ title: 't' })
      expect(mockOpen).toHaveBeenCalledWith(
        anyComponent,
        expect.objectContaining({ props: expect.objectContaining({ type: 'warn' }) })
      )
    })

    test('passes title and message as props', () => {
      const { warn } = useAlert()
      warn({ title: 'Delete?', message: 'This cannot be undone.' })
      expect(mockOpen).toHaveBeenCalledWith(
        anyComponent,
        expect.objectContaining({
          props: expect.objectContaining({ title: 'Delete?', message: 'This cannot be undone.' })
        })
      )
    })

    test('works with no args (all defaults)', () => {
      const { warn } = useAlert()
      warn()
      expect(mockOpen).toHaveBeenCalledWith(
        anyComponent,
        expect.objectContaining({
          open_sfx: 'notice.error',
          props: expect.objectContaining({ cancelAudio: 'dialog.dismiss' })
        })
      )
    })

    test('returns the resolved result and the overlay close function', () => {
      const { warn } = useAlert()
      const { response, close } = warn({ title: 't' })
      expect(response).toBeInstanceOf(Promise)
      expect(typeof close).toBe('function')
    })
  })

  describe('info()', () => {
    test('opens with the default open_sfx role when openAudio is omitted', () => {
      const { info } = useAlert()
      info({ title: 'FYI' })
      expect(mockOpen).toHaveBeenCalledWith(
        anyComponent,
        expect.objectContaining({ open_sfx: 'notice.error' })
      )
    })

    test('passes default cancelAudio to the alert component when cancelAudio is omitted', () => {
      const { info } = useAlert()
      info({ title: 'FYI' })
      expect(mockOpen).toHaveBeenCalledWith(
        anyComponent,
        expect.objectContaining({
          props: expect.objectContaining({ cancelAudio: 'dialog.dismiss' })
        })
      )
    })

    test('opens with type: info', () => {
      const { info } = useAlert()
      info()
      expect(mockOpen).toHaveBeenCalledWith(
        anyComponent,
        expect.objectContaining({ props: expect.objectContaining({ type: 'info' }) })
      )
    })

    test('opens with popup presentation', () => {
      const { info } = useAlert()
      info()
      expect(mockOpen).toHaveBeenCalledWith(
        anyComponent,
        expect.objectContaining({ presentation: 'popup' })
      )
    })
  })
})
