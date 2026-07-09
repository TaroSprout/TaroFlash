import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, reactive, ref, computed } from 'vue'
import TabDesign from '@/views/deck/deck-settings/tab-design/index.vue'
import { deckEditorKey } from '@/composables/deck/editor'
import { deckSettingsLayoutKey } from '@/views/deck/deck-settings/layout'

vi.mock('@/sfx/bus', () => ({ emitSfx: vi.fn() }))

const DeckPreviewStub = defineComponent({
  name: 'DeckDesignPreview',
  props: ['cover', 'card_attributes', 'side', 'front_text', 'back_text'],
  emits: ['update:side'],
  setup(props, { emit }) {
    return () =>
      h('div', {
        'data-testid': 'deck-preview-stub',
        'data-side': props.side,
        onClick: () => emit('update:side', 'front')
      })
  }
})

const TabBarStub = defineComponent({
  name: 'TabBar',
  emits: ['update:active'],
  setup(_p, { emit }) {
    return () =>
      h('div', {
        'data-testid': 'tab-bar-stub',
        onClick: () => emit('update:active', 'back')
      })
  }
})

const CoverDesignerStub = defineComponent({
  name: 'CoverDesigner',
  setup() {
    return () => h('div', { 'data-testid': 'cover-designer-stub' })
  }
})

const CardDesignerStub = defineComponent({
  name: 'CardDesigner',
  setup() {
    return () => h('div', { 'data-testid': 'card-designer-stub' })
  }
})

function makeEditor(overrides = {}) {
  return {
    settings: reactive({ id: 7 }),
    cover: reactive({}),
    card_attributes: reactive({ front: {}, back: {} }),
    active_side: ref('cover'),
    preview_front_text: ref(undefined),
    preview_back_text: ref(undefined),
    setActiveSide: vi.fn(),
    ...overrides
  }
}

function makeWrapper(editor = makeEditor(), layout_mode = 'desktop') {
  const wrapper = mount(TabDesign, {
    global: {
      provide: {
        [deckEditorKey]: editor,
        [deckSettingsLayoutKey]: computed(() => layout_mode)
      },
      stubs: {
        DeckDesignPreview: DeckPreviewStub,
        TabBar: TabBarStub,
        CoverDesigner: CoverDesignerStub,
        CardDesigner: CardDesignerStub,
        DeckSaveButton: true
      },
      mocks: { $t: (k) => k }
    }
  })
  return { wrapper, editor }
}

describe('TabDesign — inline preview visibility', () => {
  test('does not render the inline preview on desktop', () => {
    const { wrapper } = makeWrapper(makeEditor(), 'desktop')
    expect(wrapper.find('[data-testid="tab-design__inline-preview"]').exists()).toBe(false)
  })

  test('renders the inline preview on sheet', () => {
    const { wrapper } = makeWrapper(makeEditor(), 'sheet')
    expect(wrapper.find('[data-testid="tab-design__inline-preview"]').exists()).toBe(true)
  })

  test('passes the active side from editor.settings to the inline preview', () => {
    const editor = makeEditor()
    editor.settings.id = 42
    const { wrapper } = makeWrapper(editor, 'sheet')

    // Preview renders with the current active side (cover by default)
    expect(wrapper.find('[data-testid="deck-preview-stub"]').attributes('data-side')).toBe('cover')
  })

  test('passes the active side from editor to the inline preview', () => {
    const editor = makeEditor()
    editor.active_side.value = 'back'
    const { wrapper } = makeWrapper(editor, 'sheet')

    expect(wrapper.find('[data-testid="deck-preview-stub"]').attributes('data-side')).toBe('back')
  })

  test('forwards inline preview update:side to editor.setActiveSide', async () => {
    const { wrapper, editor } = makeWrapper(makeEditor(), 'sheet')

    await wrapper.find('[data-testid="deck-preview-stub"]').trigger('click')

    expect(editor.setActiveSide).toHaveBeenCalledWith('front')
  })
})

describe('TabDesign — designer selection by active side', () => {
  test('renders the cover designer when active side is cover', () => {
    const editor = makeEditor()
    editor.active_side.value = 'cover'
    const { wrapper } = makeWrapper(editor)

    expect(wrapper.find('[data-testid="cover-designer-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-designer-stub"]').exists()).toBe(false)
  })

  test('renders the card designer when active side is front or back', () => {
    const editor = makeEditor()
    editor.active_side.value = 'front'
    const { wrapper } = makeWrapper(editor)

    expect(wrapper.find('[data-testid="card-designer-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="cover-designer-stub"]').exists()).toBe(false)
  })
})
