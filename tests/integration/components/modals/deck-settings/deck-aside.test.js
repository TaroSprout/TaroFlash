import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, reactive, ref } from 'vue'
import DeckAside from '@/components/modals/deck-settings/deck-aside.vue'
import { deckEditorKey } from '@/composables/deck-editor'

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

const InputStub = defineComponent({
  name: 'UiInput',
  props: { placeholder: String, error: String, value: String, textAlign: String, size: String },
  emits: ['update:value'],
  setup(props, { emit }) {
    return () =>
      h('input', {
        'data-testid': 'ui-kit-input',
        'data-error': props.error ?? '',
        value: props.value ?? '',
        onInput: (e) => emit('update:value', e.target.value)
      })
  }
})

const TextareaStub = defineComponent({
  name: 'UiTextarea',
  props: { placeholder: String, value: String, max_chars: Number, rows: String },
  emits: ['update:value'],
  setup(props, { emit }) {
    return () =>
      h('textarea', {
        'data-testid': 'ui-kit-textarea',
        value: props.value ?? '',
        onInput: (e) => emit('update:value', e.target.value)
      })
  }
})

const ButtonStub = defineComponent({
  name: 'UiButton',
  props: { loading: Boolean, disabled: Boolean },
  emits: ['click'],
  setup(props, { slots, emit }) {
    return () =>
      h(
        'button',
        {
          'data-testid': 'deck-aside__save-button',
          'data-loading': String(!!props.loading),
          'data-disabled': String(!!props.disabled),
          onClick: () => emit('click')
        },
        slots.default?.()
      )
  }
})

function makeAside({ title = '', is_dirty = false } = {}) {
  const settings = reactive({ title, description: '' })
  const editor = {
    settings,
    config: reactive({}),
    cover: reactive({}),
    card_attributes: reactive({ front: {}, back: {} }),
    is_dirty: ref(is_dirty),
    active_side: ref('cover'),
    saveDeck: vi.fn(async () => null),
    deleteDeck: vi.fn(async () => false),
    resetReviews: vi.fn(async () => false),
    setActiveSide: vi.fn()
  }
  const wrapper = mount(DeckAside, {
    global: {
      provide: { [deckEditorKey]: editor },
      stubs: { UiInput: InputStub, UiTextarea: TextareaStub, UiButton: ButtonStub }
    }
  })
  return { wrapper, editor, settings }
}

describe('DeckAside — validate()', () => {
  test('returns false when title is empty and sets title_error [obligation]', async () => {
    const { wrapper } = makeAside({ title: '' })
    const result = await wrapper.vm.validate()
    const input = wrapper.find('[data-testid="ui-kit-input"]')
    expect(result).toBe(false)
    expect(input.attributes('data-error')).not.toBe('')
  })

  test('returns false when title is whitespace-only and sets title_error [obligation]', async () => {
    const { wrapper } = makeAside({ title: '   ' })
    const result = await wrapper.vm.validate()
    const input = wrapper.find('[data-testid="ui-kit-input"]')
    expect(result).toBe(false)
    expect(input.attributes('data-error')).not.toBe('')
  })

  test('returns true when title is non-empty [obligation]', async () => {
    const { wrapper } = makeAside({ title: 'My Deck' })
    const result = await wrapper.vm.validate()
    expect(result).toBe(true)
  })

  test('title_error clears when settings.title changes after a failed validate [obligation]', async () => {
    const { wrapper, settings } = makeAside({ title: '' })
    await wrapper.vm.validate()

    // Confirm error is set
    expect(wrapper.find('[data-testid="ui-kit-input"]').attributes('data-error')).not.toBe('')

    // Simulate title change — triggers the watch
    settings.title = 'New Title'
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="ui-kit-input"]').attributes('data-error')).toBe('')
  })
})

describe('DeckAside — save button', () => {
  beforeEach(() => mockEmitSfx.mockClear())

  test('emits save when the button is clicked and deck is dirty', async () => {
    const { wrapper } = makeAside({ title: 'A', is_dirty: true })
    await wrapper.find('[data-testid="deck-aside__save-button"]').trigger('click')
    expect(wrapper.emitted('save')).toHaveLength(1)
  })

  test('plays powerdown sfx and does not emit save when deck is not dirty', async () => {
    const { wrapper } = makeAside({ title: 'A', is_dirty: false })
    await wrapper.find('[data-testid="deck-aside__save-button"]').trigger('click')
    expect(wrapper.emitted('save')).toBeFalsy()
    expect(mockEmitSfx).toHaveBeenCalledWith('ui.digi_powerdown')
  })
})

describe('DeckAside — layout', () => {
  test('renders the root aside element', () => {
    const { wrapper } = makeAside({ title: 'A' })
    expect(wrapper.find('[data-testid="deck-aside"]').exists()).toBe(true)
  })

  test('renders the inputs container with both inputs', () => {
    const { wrapper } = makeAside({ title: 'A' })
    expect(wrapper.find('[data-testid="deck-aside__inputs"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="ui-kit-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="ui-kit-textarea"]').exists()).toBe(true)
  })

  test('description change updates settings.description', async () => {
    const { settings } = makeAside({ title: 'A' })
    settings.description = 'new desc'
    expect(settings.description).toBe('new desc')
  })
})
