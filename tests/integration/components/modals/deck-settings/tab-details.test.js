import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, reactive, ref, computed, useAttrs } from 'vue'

vi.mock('@/sfx/bus', () => ({ emitSfx: vi.fn() }))
vi.mock('@/composables/ui/media-query', () => ({ useMatchMedia: () => ({ value: false }) }))

import TabDetails from '@/views/deck/deck-settings/tab-details/index.vue'
import DeckSaveButton from '@/views/deck/deck-settings/deck-save-button.vue'
import { deckEditorKey } from '@/composables/deck/editor'
import { deckSettingsLayoutKey } from '@/views/deck/deck-settings/layout'
import { deckSettingsCloseKey } from '@/views/deck/deck-settings/layout'

vi.mock('@/stores/notice-store', () => ({
  useNoticeStore: () => ({ error: vi.fn(), success: vi.fn(), warn: vi.fn() })
}))

const InputStub = defineComponent({
  name: 'UiInput',
  props: {
    value: { type: String, default: '' },
    placeholder: { type: String, default: '' },
    maxLength: { type: Number, default: undefined }
  },
  emits: ['update:value'],
  inheritAttrs: false,
  setup(props, { emit }) {
    const attrs = useAttrs()
    return () =>
      h('input', {
        ...attrs,
        'data-testid': 'ui-input',
        'data-placeholder': props.placeholder,
        maxlength: props.maxLength,
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
          'data-disabled': String(!!props.disabled),
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

const SaveButtonStub = defineComponent({
  name: 'DeckSaveButton',
  setup() {
    return () => h('div', { 'data-testid': 'deck-save-button-stub' })
  }
})

function makeEditor(overrides = {}) {
  const draft = reactive({ title: 'My Deck', description: 'A test deck', ...overrides })
  return {
    draft,
    is_dirty: ref(false),
    has_title: computed(() => !!draft.title?.trim()),
    title_error: ref(undefined),
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

  test('title input bound to editor.draft.title [obligation]', async () => {
    const editor = makeEditor({ title: 'Old Title' })
    const { wrapper } = makeTab('sheet', editor)
    await wrapper.find('[data-testid="ui-input"]').setValue('New Title')
    expect(editor.draft.title).toBe('New Title')
  })

  test('description textarea bound to editor.draft.description [obligation]', async () => {
    const editor = makeEditor({ description: 'Old desc' })
    const { wrapper } = makeTab('sheet', editor)
    await wrapper.find('[data-testid="ui-textarea"]').setValue('New desc')
    expect(editor.draft.description).toBe('New desc')
  })

  test('title input carries DECK_TITLE_MAX_LENGTH as maxlength', () => {
    const { wrapper } = makeTab()
    expect(wrapper.find('[data-testid="ui-input"]').attributes('maxlength')).toBe('15')
  })

  test('does not render a back button (chrome-driven back replaced the inline button) [obligation]', () => {
    const { wrapper } = makeTab('sheet')
    expect(wrapper.find('[data-testid="deck-back-button-stub"]').exists()).toBe(false)
    expect(wrapper.emitted('back')).toBeUndefined()
  })

  test('save button rendered in sheet mode [obligation]', () => {
    const { wrapper } = makeTab('sheet')
    expect(wrapper.find('[data-testid="deck-save-button-stub"]').exists()).toBe(true)
  })

  test('save button not rendered in tablet mode', () => {
    const { wrapper } = makeTab('tablet')
    expect(wrapper.find('[data-testid="deck-save-button-stub"]').exists()).toBe(false)
  })

  test('title input carries the error set on the shared editor instance [obligation]', () => {
    const editor = makeEditor({ title: '' })
    const { wrapper } = makeTab('sheet', editor)
    editor.title_error.value = 'Give this deck a title'
    return wrapper.vm.$nextTick().then(() => {
      expect(wrapper.find('[data-testid="ui-input"]').attributes('error')).toBe(
        'Give this deck a title'
      )
    })
  })
})

describe('TabDetails + DeckSaveButton — shared editor instance [obligation]', () => {
  test('title_error set by deck-save-button onSave is visible in tab-details rendered error', async () => {
    const editor = makeEditor({ title: '' })
    const close = vi.fn()
    const wrapper = mount(TabDetails, {
      global: {
        provide: {
          [deckEditorKey]: editor,
          [deckSettingsLayoutKey]: computed(() => 'sheet'),
          [deckSettingsCloseKey]: close
        },
        stubs: {
          UiInput: InputStub,
          UiTextarea: TextareaStub,
          UiButton: ButtonStub,
          DeckSaveButton,
          SectionList: PassthroughStub
        },
        mocks: { $t: (k) => k }
      }
    })

    await wrapper.find('[data-testid="deck-settings__save-button"]').trigger('click')

    expect(wrapper.find('[data-testid="ui-input"]').attributes('error')).toBe(
      'Give your deck a name'
    )
    expect(close).not.toHaveBeenCalled()
  })
})
