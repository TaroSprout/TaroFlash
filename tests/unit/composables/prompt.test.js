import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { usePrompt } from '@/composables/prompt'

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
const { mockOpen } = vi.hoisted(() => ({ mockOpen: vi.fn() }))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

vi.mock('@/composables/modal', () => ({
  useModal: vi.fn(() => ({ open: mockOpen }))
}))

// prompt.vue is imported directly by the composable, but tests only assert on
// what's passed to `modal.open` — the component's identity doesn't matter.
const anyComponent = expect.anything()

function makeModalResult() {
  return { response: Promise.resolve(undefined) }
}

beforeEach(() => {
  mockEmitSfx.mockClear()
  mockOpen.mockClear()
  mockOpen.mockReturnValue(makeModalResult())
})

describe('usePrompt — ask()', () => {
  test('calls emitSfx with the default open audio when openAudio is omitted [obligation]', () => {
    const { ask } = usePrompt()
    ask({ title: 'Name it', confirmLabel: 'Create' })
    expect(mockEmitSfx).toHaveBeenCalledWith('etc_woodblock_stuck')
  })

  test('calls emitSfx with the provided openAudio when supplied', () => {
    const { ask } = usePrompt()
    ask({ title: 'Name it', confirmLabel: 'Create', openAudio: 'slide_up' })
    expect(mockEmitSfx).toHaveBeenCalledWith('slide_up')
  })

  test('passes default cancelAudio to the prompt component when cancelAudio is omitted [obligation]', () => {
    const { ask } = usePrompt()
    ask({ title: 'Name it', confirmLabel: 'Create' })
    expect(mockOpen).toHaveBeenCalledWith(
      anyComponent,
      expect.objectContaining({
        props: expect.objectContaining({ cancelAudio: 'digi_powerdown' })
      })
    )
  })

  test('passes provided cancelAudio to the prompt component when supplied', () => {
    const { ask } = usePrompt()
    ask({ title: 'Name it', confirmLabel: 'Create', cancelAudio: 'slide_up' })
    expect(mockOpen).toHaveBeenCalledWith(
      anyComponent,
      expect.objectContaining({
        props: expect.objectContaining({ cancelAudio: 'slide_up' })
      })
    )
  })

  test('opens the modal with backdrop: true by default', () => {
    const { ask } = usePrompt()
    ask({ title: 'Name it', confirmLabel: 'Create' })
    expect(mockOpen).toHaveBeenCalledWith(anyComponent, expect.objectContaining({ backdrop: true }))
  })

  test('respects a custom backdrop: false', () => {
    const { ask } = usePrompt()
    ask({ title: 'Name it', confirmLabel: 'Create', backdrop: false })
    expect(mockOpen).toHaveBeenCalledWith(
      anyComponent,
      expect.objectContaining({ backdrop: false })
    )
  })

  test('opens the modal with mode: popup [obligation]', () => {
    const { ask } = usePrompt()
    ask({ title: 'Name it', confirmLabel: 'Create' })
    expect(mockOpen).toHaveBeenCalledWith(anyComponent, expect.objectContaining({ mode: 'popup' }))
  })

  test('forwards title, message, label, placeholder, initialValue, confirmLabel, cancelLabel, maxLength as props', () => {
    const { ask } = usePrompt()
    ask({
      title: 'Rename preset',
      message: 'Give it a new name.',
      label: 'Name',
      placeholder: 'e.g. Aggressive',
      initialValue: 'Old name',
      confirmLabel: 'Rename',
      cancelLabel: 'Nevermind',
      maxLength: 40
    })
    expect(mockOpen).toHaveBeenCalledWith(
      anyComponent,
      expect.objectContaining({
        props: expect.objectContaining({
          title: 'Rename preset',
          message: 'Give it a new name.',
          label: 'Name',
          placeholder: 'e.g. Aggressive',
          initialValue: 'Old name',
          confirmLabel: 'Rename',
          cancelLabel: 'Nevermind',
          maxLength: 40
        })
      })
    )
  })

  test('resolves .response to the value the modal resolves with', async () => {
    mockOpen.mockReturnValue({ response: Promise.resolve('Aggressive') })
    const { ask } = usePrompt()
    await expect(ask({ title: 'Name it', confirmLabel: 'Create' }).response).resolves.toBe(
      'Aggressive'
    )
  })

  test('resolves .response to undefined when the modal is cancelled', async () => {
    mockOpen.mockReturnValue({ response: Promise.resolve(undefined) })
    const { ask } = usePrompt()
    await expect(
      ask({ title: 'Name it', confirmLabel: 'Create' }).response
    ).resolves.toBeUndefined()
  })

  test('emits the default close audio when the modal settles [obligation]', async () => {
    const { ask } = usePrompt()
    ask({ title: 'Name it', confirmLabel: 'Create' })
    await Promise.resolve()
    expect(mockEmitSfx).toHaveBeenCalledWith('pop_up_close')
  })

  test('emits the provided closeAudio when the modal settles', async () => {
    const { ask } = usePrompt()
    ask({ title: 'Name it', confirmLabel: 'Create', closeAudio: 'slide_up' })
    await Promise.resolve()
    expect(mockEmitSfx).toHaveBeenCalledWith('slide_up')
  })
})
