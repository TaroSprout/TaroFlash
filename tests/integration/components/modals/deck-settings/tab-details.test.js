import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, reactive, ref, computed, useAttrs } from 'vue'

vi.mock('@/sfx/bus', () => ({ emitSfx: vi.fn() }))
vi.mock('@/composables/ui/media-query', () => ({ useMatchMedia: () => ({ value: false }) }))

import TabDetails from '@/components/modals/deck-settings/tab-details/index.vue'
import { deckEditorKey } from '@/composables/deck/editor'
import { deckSettingsLayoutKey } from '@/components/modals/deck-settings/layout'
import { deckSettingsCloseKey } from '@/components/modals/deck-settings/layout'

const InputStub = defineComponent({
  name: 'UiInput',
  props: { value: { type: String, default: '' }, placeholder: { type: String, default: '' } },
  emits: ['update:value'],
  inheritAttrs: false,
  setup(props, { emit }) {
    const attrs = useAttrs()
    return () =>
      h('input', {
        ...attrs,
        'data-testid': 'ui-input',
        'data-placeholder': props.placeholder,
        value: props.value,
        onInput: (e) => emit('update:value', e.target.value)
      })
  }
})

const TextareaStub = defineComponent({
  name: 'UiTextarea',
  props: { value: { type: String, default: '' }, placeholder: { type: String, default: '' } },
  emits: ['update:value'],
  inheritAttrs: false,
  setup(props, { emit }) {
    const attrs = useAttrs()
    return () =>
      h('textarea', {
        ...attrs,
        'data-testid': 'ui-textarea',
        'data-placeholder': props.placeholder,
        value: props.value,
        onInput: (e) => emit('update:value', e.target.value)
      })
  }
})

const ButtonStub = defineComponent({
  name: 'UiButton',
  props: {
    loading: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false }
  },
  emits: ['press'],
  inheritAttrs: false,
  setup(props, { slots, emit }) {
    const attrs = useAttrs()
    return () =>
      h(
        'button',
        {
          type: 'button',
          ...attrs,
          'data-loading': String(!!props.loading),
          disabled: props.loading || props.disabled,
          onClick: (e) => emit('press', e)
        },
        slots.default?.()
      )
  }
})

const PassthroughStub = defineComponent({
  inheritAttrs: false,
  setup(_p, { slots }) {
    const attrs = useAttrs()
    return () => h('div', { ...attrs }, slots.default?.())
  }
})

const BackButtonStub = defineComponent({
  name: 'DeckBackButton',
  emits: ['back'],
  setup(_p, { emit }) {
    return () =>
      h('button', { 'data-testid': 'deck-back-button-stub', onClick: () => emit('back') })
  }
})

const SaveButtonStub = defineComponent({
  name: 'DeckSaveButton',
  setup() {
    return () => h('div', { 'data-testid': 'deck-save-button-stub' })
  }
})

function makeEditor(overrides = {}) {
  return {
    settings: reactive({ title: 'My Deck', description: 'A test deck', ...overrides }),
    is_dirty: ref(false),
    saveDeck: vi.fn().mockResolvedValue(true)
  }
}

function makeTab(layout = 'sheet', editor = makeEditor()) {
  const close = vi.fn()
  const wrapper = mount(TabDetails, {
    global: {
      provide: {
        [deckEditorKey]: editor,
        [deckSettingsLayoutKey]: computed(() => layout),
        [deckSettingsCloseKey]: close
      },
      stubs: {
        UiInput: InputStub,
        UiTextarea: TextareaStub,
        UiButton: ButtonStub,
        DeckBackButton: BackButtonStub,
        DeckSaveButton: SaveButtonStub,
        SectionList: PassthroughStub
      },
      mocks: { $t: (k) => k }
    }
  })
  return { wrapper, editor, close }
}

describe('TabDetails [obligation]', () => {
  test('renders the details container', () => {
    const { wrapper } = makeTab()
    expect(wrapper.find('[data-testid="tab-details"]').exists()).toBe(true)
  })

  test('renders title input and description textarea [obligation]', () => {
    const { wrapper } = makeTab()
    expect(wrapper.find('[data-testid="tab-details__inputs"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="ui-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="ui-textarea"]').exists()).toBe(true)
  })

  test('title input bound to editor.settings.title [obligation]', async () => {
    const editor = makeEditor({ title: 'Old Title' })
    const { wrapper } = makeTab('sheet', editor)
    await wrapper.find('[data-testid="ui-input"]').setValue('New Title')
    expect(editor.settings.title).toBe('New Title')
  })

  test('description textarea bound to editor.settings.description [obligation]', async () => {
    const editor = makeEditor({ description: 'Old desc' })
    const { wrapper } = makeTab('sheet', editor)
    await wrapper.find('[data-testid="ui-textarea"]').setValue('New desc')
    expect(editor.settings.description).toBe('New desc')
  })

  test('emits back when back button is clicked [obligation]', async () => {
    const { wrapper } = makeTab('sheet')
    await wrapper.find('[data-testid="deck-back-button-stub"]').trigger('click')
    expect(wrapper.emitted('back')).toHaveLength(1)
  })

  test('save button rendered in sheet mode [obligation]', () => {
    const { wrapper } = makeTab('sheet')
    expect(wrapper.find('[data-testid="deck-save-button-stub"]').exists()).toBe(true)
  })

  test('save button not rendered in tablet mode', () => {
    const { wrapper } = makeTab('tablet')
    expect(wrapper.find('[data-testid="deck-save-button-stub"]').exists()).toBe(false)
  })
})
