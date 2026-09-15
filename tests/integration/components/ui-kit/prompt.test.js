import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import UiPrompt from '@/components/ui-kit/prompt.vue'
import { makeOverlayContext, OVERLAY_CONTEXT_KEY } from '@tests/fixtures/overlay'
import { motionStoreStub } from '@tests/fixtures/motion'

vi.mock('@/stores/motion', () => ({ useMotionStore: () => motionStoreStub() }))

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

vi.mock('@floating-ui/vue', () => ({
  useFloating: vi.fn(() => ({
    floatingStyles: { value: {} },
    update: vi.fn()
  })),
  flip: vi.fn(() => ({})),
  offset: vi.fn(() => ({})),
  autoUpdate: vi.fn(() => () => {})
}))

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: vi.fn(() => ({ value: false }))
}))

// ── Mount helper ──────────────────────────────────────────────────────────────

// The prompt renders only the box — overlay-surface (the real component
// here) owns the backdrop and routes a self-click through the overlay
// context's dismiss(), separate from the prompt's own close(outcome) on
// cancel/confirm.
function makeWrapper(props = {}, overrides = {}) {
  const close = vi.fn()
  const dismiss = vi.fn()
  const wrapper = mount(UiPrompt, {
    props: {
      title: 'Name it',
      confirmLabel: 'Create',
      ...props
    },
    attachTo: document.body,
    global: {
      provide: { [OVERLAY_CONTEXT_KEY]: makeOverlayContext({ close, dismiss, ...overrides }) }
    }
  })
  return { wrapper, close, dismiss }
}

function input(wrapper) {
  return wrapper.find('[data-testid="ui-kit-prompt__input"] input')
}

function confirmButton(wrapper) {
  return wrapper.find('[data-testid="ui-kit-prompt__confirm"]')
}

function cancelButton(wrapper) {
  return wrapper.find('[data-testid="ui-kit-prompt__cancel"]')
}

// The error message renders via UiTooltip, which teleports its content to
// <body> rather than into the component's own subtree.
function errorTooltipText() {
  return document.body.querySelector('[data-testid="ui-tooltip"]')?.textContent ?? ''
}

beforeEach(() => {
  mockEmitSfx.mockClear()
  document.body.innerHTML = ''
})

// ── confirm ───────────────────────────────────────────────────────────────────

describe('UiPrompt — confirm', () => {
  test('confirm resolves the trimmed string, not the raw input value', async () => {
    const { wrapper, close } = makeWrapper()
    await input(wrapper).setValue('  My Preset  ')

    await confirmButton(wrapper).trigger('click')

    expect(close).toHaveBeenCalledWith('My Preset')
  })

  test('a whitespace-only value blocks confirm — close is never called', async () => {
    const { wrapper, close } = makeWrapper()
    await input(wrapper).setValue('   ')

    await confirmButton(wrapper).trigger('click')

    expect(close).not.toHaveBeenCalled()
  })

  test('an empty value blocks confirm — close is never called', async () => {
    const { wrapper, close } = makeWrapper()

    await confirmButton(wrapper).trigger('click')

    expect(close).not.toHaveBeenCalled()
  })

  test('the required error is absent before the field is touched, even though the value is empty', () => {
    makeWrapper()
    expect(errorTooltipText()).toBe('')
  })

  test('the required error surfaces only after a blocked confirm makes the field dirty', async () => {
    const { wrapper } = makeWrapper()

    await confirmButton(wrapper).trigger('click')

    expect(errorTooltipText()).toContain('Enter a name')
  })

  test('typing then clearing the field also surfaces the required error (dirty via @input)', async () => {
    const { wrapper } = makeWrapper()

    await input(wrapper).setValue('a')
    await input(wrapper).setValue('')

    expect(errorTooltipText()).toContain('Enter a name')
  })
})

// ── sound effects ──────────────────────────────────────────────────

describe('UiPrompt — sound effects', () => {
  test('confirm plays confirmAudio when provided', async () => {
    const { wrapper } = makeWrapper({ confirmAudio: 'card.delete' })
    await input(wrapper).setValue('My Preset')

    await confirmButton(wrapper).trigger('click')

    expect(mockEmitSfx).toHaveBeenCalledWith('card.delete')
  })

  test('confirm stays silent when confirmAudio is omitted', async () => {
    const { wrapper } = makeWrapper()
    await input(wrapper).setValue('My Preset')
    mockEmitSfx.mockClear()

    await confirmButton(wrapper).trigger('click')

    // UiButton names no press role of its own, and prompt.vue adds nothing on
    // top, so an omitted confirmAudio means the click is silent.
    expect(mockEmitSfx).not.toHaveBeenCalled()
  })

  test('cancel plays cancelAudio when provided', async () => {
    const { wrapper } = makeWrapper({ cancelAudio: 'ui.deselect' })

    await cancelButton(wrapper).trigger('click')

    expect(mockEmitSfx).toHaveBeenCalledWith('ui.deselect')
  })

  test('cancel stays silent when cancelAudio is omitted', async () => {
    const { wrapper } = makeWrapper()
    mockEmitSfx.mockClear()

    await cancelButton(wrapper).trigger('click')

    expect(mockEmitSfx).not.toHaveBeenCalled()
  })
})

// ── message ──────────────────────────────────────────────────────────────────

describe('UiPrompt — message', () => {
  test('renders the message paragraph when provided', () => {
    const { wrapper } = makeWrapper({ message: 'This forks the deck onto a new preset.' })
    expect(wrapper.find('[data-testid="ui-kit-prompt__body"] p').text()).toBe(
      'This forks the deck onto a new preset.'
    )
  })

  test('renders no message paragraph when omitted', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="ui-kit-prompt__body"] p').exists()).toBe(false)
  })
})

// ── station ────────────────────────────────────────────────────

describe('UiPrompt — station', () => {
  test('stamps the constant data-station="window"', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="ui-kit-prompt"]').attributes('data-station')).toBe('window')
  })
})

// ── cancel ────────────────────────────────────────────────────────────────────

describe('UiPrompt — cancel', () => {
  test('cancel resolves undefined', async () => {
    const { wrapper, close } = makeWrapper()

    await cancelButton(wrapper).trigger('click')

    expect(close).toHaveBeenCalledWith(undefined)
  })

  test('cancel does not require a non-empty value', async () => {
    const { wrapper, close } = makeWrapper()

    await cancelButton(wrapper).trigger('click')

    expect(close).toHaveBeenCalledTimes(1)
  })
})

// ── dismissal via the overlay-surface backdrop ────────────────────────────────

describe('UiPrompt — backdrop dismissal', () => {
  test('a click on the overlay-surface routes through the overlay context dismiss, not close', async () => {
    const { wrapper, close, dismiss } = makeWrapper()

    await wrapper.find('[data-testid="overlay-surface"]').trigger('click')

    expect(dismiss).toHaveBeenCalledTimes(1)
    expect(close).not.toHaveBeenCalled()
  })

  test('clicking inside the prompt box does not dismiss or close it', async () => {
    const { wrapper, close, dismiss } = makeWrapper()

    await wrapper.find('[data-testid="ui-kit-prompt"]').trigger('click')

    expect(dismiss).not.toHaveBeenCalled()
    expect(close).not.toHaveBeenCalled()
  })
})

// ── initial value ─────────────────────────────────────────────────────────────

describe('UiPrompt — initialValue', () => {
  test('seeds the input with initialValue', () => {
    const { wrapper } = makeWrapper({ initialValue: 'Aggressive' })
    expect(input(wrapper).element.value).toBe('Aggressive')
  })

  test('confirming an untouched initialValue resolves it trimmed', async () => {
    const { wrapper, close } = makeWrapper({ initialValue: '  Aggressive  ' })

    await confirmButton(wrapper).trigger('click')

    expect(close).toHaveBeenCalledWith('Aggressive')
  })
})
