import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import UiPrompt from '@/components/ui-kit/prompt.vue'

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

function makeWrapper(props = {}) {
  const close = vi.fn()
  const wrapper = mount(UiPrompt, {
    props: {
      title: 'Name it',
      confirmLabel: 'Create',
      close,
      ...props
    },
    attachTo: document.body,
    global: {
      directives: { sfx: {} }
    }
  })
  return { wrapper, close }
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

describe('UiPrompt — confirm [obligation]', () => {
  test('confirm resolves the trimmed string, not the raw input value [obligation]', async () => {
    const { wrapper, close } = makeWrapper()
    await input(wrapper).setValue('  My Preset  ')

    await confirmButton(wrapper).trigger('click')

    expect(close).toHaveBeenCalledWith('My Preset')
  })

  test('a whitespace-only value blocks confirm — close is never called [obligation]', async () => {
    const { wrapper, close } = makeWrapper()
    await input(wrapper).setValue('   ')

    await confirmButton(wrapper).trigger('click')

    expect(close).not.toHaveBeenCalled()
  })

  test('an empty value blocks confirm — close is never called [obligation]', async () => {
    const { wrapper, close } = makeWrapper()

    await confirmButton(wrapper).trigger('click')

    expect(close).not.toHaveBeenCalled()
  })

  test('the required error is absent before the field is touched, even though the value is empty [obligation]', () => {
    makeWrapper()
    expect(errorTooltipText()).toBe('')
  })

  test('the required error surfaces only after a blocked confirm makes the field dirty [obligation]', async () => {
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

// ── sound effects [obligation] ──────────────────────────────────────────────────

describe('UiPrompt — sound effects', () => {
  test('confirm plays confirmAudio when provided', async () => {
    const { wrapper } = makeWrapper({ confirmAudio: 'trash_crumple_short' })
    await input(wrapper).setValue('My Preset')

    await confirmButton(wrapper).trigger('click')

    expect(mockEmitSfx).toHaveBeenCalledWith('trash_crumple_short')
  })

  test('confirm plays no sound when confirmAudio is omitted', async () => {
    const { wrapper } = makeWrapper()
    await input(wrapper).setValue('My Preset')

    await confirmButton(wrapper).trigger('click')

    expect(mockEmitSfx).not.toHaveBeenCalled()
  })

  test('cancel plays cancelAudio when provided', async () => {
    const { wrapper } = makeWrapper({ cancelAudio: 'digi_powerdown' })

    await cancelButton(wrapper).trigger('click')

    expect(mockEmitSfx).toHaveBeenCalledWith('digi_powerdown')
  })

  test('cancel plays no sound when cancelAudio is omitted', async () => {
    const { wrapper } = makeWrapper()

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

// ── cancel ────────────────────────────────────────────────────────────────────

describe('UiPrompt — cancel', () => {
  test('cancel resolves undefined [obligation]', async () => {
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
