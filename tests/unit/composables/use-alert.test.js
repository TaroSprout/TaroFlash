import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { useAlert } from '@/composables/alert'

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
const { mockOpen } = vi.hoisted(() => ({ mockOpen: vi.fn() }))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

vi.mock('@/composables/modal', () => ({
  useModal: vi.fn(() => ({ open: mockOpen }))
}))

// alert.vue is defineAsyncComponent-wrapped in some contexts, but here the
// composable imports it directly. Match by shape so the identity doesn't matter.
const anyComponent = expect.anything()

function makeModalResult() {
  return { response: Promise.resolve(undefined) }
}

describe('useAlert', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
    mockOpen.mockClear()
    mockOpen.mockReturnValue(makeModalResult())
  })

  describe('warn()', () => {
    test('calls emitSfx with the default open audio when openAudio is omitted [obligation]', () => {
      const { warn } = useAlert()
      warn({ title: 'Are you sure?' })
      expect(mockEmitSfx).toHaveBeenCalledWith('etc_woodblock_stuck')
    })

    test('calls emitSfx with the provided openAudio when supplied', () => {
      const { warn } = useAlert()
      warn({ title: 'x', openAudio: 'slide_up' })
      expect(mockEmitSfx).toHaveBeenCalledWith('slide_up')
    })

    test('passes default cancelAudio to the alert component when cancelAudio is omitted [obligation]', () => {
      const { warn } = useAlert()
      warn({ title: 'Are you sure?' })
      expect(mockOpen).toHaveBeenCalledWith(
        anyComponent,
        expect.objectContaining({
          props: expect.objectContaining({ cancelAudio: 'digi_powerdown' })
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

    test('opens the modal with backdrop: true by default', () => {
      const { warn } = useAlert()
      warn()
      expect(mockOpen).toHaveBeenCalledWith(
        anyComponent,
        expect.objectContaining({ backdrop: true })
      )
    })

    test('opens the modal with mode: popup [obligation]', () => {
      const { warn } = useAlert()
      warn()
      expect(mockOpen).toHaveBeenCalledWith(
        anyComponent,
        expect.objectContaining({ mode: 'popup' })
      )
    })

    test('opens the modal with type: warn', () => {
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
      expect(mockEmitSfx).toHaveBeenCalledWith('etc_woodblock_stuck')
      expect(mockOpen).toHaveBeenCalledWith(
        anyComponent,
        expect.objectContaining({
          props: expect.objectContaining({ cancelAudio: 'digi_powerdown' })
        })
      )
    })

    test('emits the default close audio when the modal settles [obligation]', async () => {
      const { warn } = useAlert()
      warn({ title: 'Are you sure?' })
      await Promise.resolve()
      expect(mockEmitSfx).toHaveBeenCalledWith('pop_up_close')
    })

    test('emits the provided closeAudio when the modal settles', async () => {
      const { warn } = useAlert()
      warn({ title: 'x', closeAudio: 'slide_up' })
      await Promise.resolve()
      expect(mockEmitSfx).toHaveBeenCalledWith('slide_up')
    })
  })

  describe('info()', () => {
    test('calls emitSfx with the default open audio when openAudio is omitted [obligation]', () => {
      const { info } = useAlert()
      info({ title: 'FYI' })
      expect(mockEmitSfx).toHaveBeenCalledWith('etc_woodblock_stuck')
    })

    test('passes default cancelAudio to the alert component when cancelAudio is omitted [obligation]', () => {
      const { info } = useAlert()
      info({ title: 'FYI' })
      expect(mockOpen).toHaveBeenCalledWith(
        anyComponent,
        expect.objectContaining({
          props: expect.objectContaining({ cancelAudio: 'digi_powerdown' })
        })
      )
    })

    test('opens the modal with type: info', () => {
      const { info } = useAlert()
      info()
      expect(mockOpen).toHaveBeenCalledWith(
        anyComponent,
        expect.objectContaining({ props: expect.objectContaining({ type: 'info' }) })
      )
    })

    test('opens the modal with mode: popup [obligation]', () => {
      const { info } = useAlert()
      info()
      expect(mockOpen).toHaveBeenCalledWith(
        anyComponent,
        expect.objectContaining({ mode: 'popup' })
      )
    })

    test('respects a custom backdrop: false', () => {
      const { info } = useAlert()
      info({ backdrop: false })
      expect(mockOpen).toHaveBeenCalledWith(
        anyComponent,
        expect.objectContaining({ backdrop: false })
      )
    })
  })
})
