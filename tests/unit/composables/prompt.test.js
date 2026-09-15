import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { usePrompt } from '@/composables/prompt'

const { mockOpen } = vi.hoisted(() => ({ mockOpen: vi.fn() }))

vi.mock('@/composables/overlay/use-overlay', () => ({
  useOverlay: vi.fn(() => ({ open: mockOpen }))
}))

// prompt.vue is imported directly by the composable, but tests only assert on
// what's passed to `overlay.open` — the component's identity doesn't matter.
const anyComponent = expect.anything()

function makeOverlayResult() {
  return { result: Promise.resolve(undefined) }
}

beforeEach(() => {
  mockOpen.mockClear()
  mockOpen.mockReturnValue(makeOverlayResult())
})

describe('usePrompt — ask()', () => {
  test('opens with the default open_sfx role when openAudio is omitted', () => {
    const { ask } = usePrompt()
    ask({ title: 'Name it', confirmLabel: 'Create' })
    expect(mockOpen).toHaveBeenCalledWith(
      anyComponent,
      expect.objectContaining({ open_sfx: 'notice.error' })
    )
  })

  test('opens with the provided openAudio as open_sfx when supplied', () => {
    const { ask } = usePrompt()
    ask({ title: 'Name it', confirmLabel: 'Create', openAudio: 'slide_up' })
    expect(mockOpen).toHaveBeenCalledWith(
      anyComponent,
      expect.objectContaining({ open_sfx: 'slide_up' })
    )
  })

  test('passes default cancelAudio to the prompt component when cancelAudio is omitted', () => {
    const { ask } = usePrompt()
    ask({ title: 'Name it', confirmLabel: 'Create' })
    expect(mockOpen).toHaveBeenCalledWith(
      anyComponent,
      expect.objectContaining({
        props: expect.objectContaining({ cancelAudio: 'dialog.dismiss' })
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

  test('opens with popup presentation', () => {
    const { ask } = usePrompt()
    ask({ title: 'Name it', confirmLabel: 'Create' })
    expect(mockOpen).toHaveBeenCalledWith(
      anyComponent,
      expect.objectContaining({ presentation: 'popup' })
    )
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

  test('resolves .response to the value the overlay resolves with', async () => {
    mockOpen.mockReturnValue({ result: Promise.resolve('Aggressive') })
    const { ask } = usePrompt()
    await expect(ask({ title: 'Name it', confirmLabel: 'Create' }).response).resolves.toBe(
      'Aggressive'
    )
  })

  test('resolves .response to undefined when the prompt is cancelled', async () => {
    mockOpen.mockReturnValue({ result: Promise.resolve(undefined) })
    const { ask } = usePrompt()
    await expect(
      ask({ title: 'Name it', confirmLabel: 'Create' }).response
    ).resolves.toBeUndefined()
  })
})
