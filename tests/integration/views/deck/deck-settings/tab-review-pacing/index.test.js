import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, reactive, ref, useAttrs } from 'vue'
import { deckEditorKey } from '@/composables/deck/editor'
import { deckSettingsLayoutKey } from '@/views/deck/deck-settings/layout'

// pacing-section.vue has its own dedicated test file — stub it here so this
// suite only exercises the toggles + divider + section order that live
// directly in tab-review-pacing/index.vue.
vi.mock('@/views/deck/deck-settings/tab-review-pacing/pacing-section.vue', async () => {
  const { defineComponent: dc, h: hh } = await import('vue')
  return {
    default: dc({
      name: 'PacingSection',
      setup: () => () => hh('div', { 'data-testid': 'pacing-section-stub' })
    })
  }
})

import TabReviewPacing from '@/views/deck/deck-settings/tab-review-pacing/index.vue'

const ToggleStub = defineComponent({
  name: 'UiToggle',
  props: { checked: { type: Boolean, default: false } },
  emits: ['update:checked'],
  inheritAttrs: false,
  setup(props, { slots, emit }) {
    const attrs = useAttrs()
    return () =>
      h(
        'label',
        {
          'data-testid': 'ui-kit-toggle',
          'data-checked': String(!!props.checked),
          ...attrs
        },
        [
          h('span', { 'data-testid': 'ui-kit-toggle__label' }, slots.default?.()),
          h('input', {
            type: 'checkbox',
            checked: !!props.checked,
            'data-testid': 'ui-kit-toggle__input',
            onChange: (e) => emit('update:checked', e.target.checked)
          })
        ]
      )
  }
})

function makeWrapper({ config: configOverrides = {}, layout_mode = 'modal' } = {}) {
  const config = reactive({ shuffle: false, flip_cards: false, ...configOverrides })
  const deck = reactive({ id: 1 })
  const editor = {
    deck,
    config,
    pacing: reactive({}),
    settings: reactive({}),
    cover: reactive({}),
    card_attributes: reactive({ front: {}, back: {} }),
    cover_image_preview: ref(undefined),
    cover_image_loading: ref(false),
    active_side: ref('cover'),
    saveDeck: async () => true,
    deleteDeck: async () => {},
    uploadImage: () => {},
    removeImage: () => {},
    setCoverImage: async () => {},
    removeCoverImage: () => {},
    setActiveSide: () => {}
  }
  const wrapper = mount(TabReviewPacing, {
    global: {
      provide: { [deckEditorKey]: editor, [deckSettingsLayoutKey]: layout_mode },
      stubs: { UiToggle: ToggleStub, DeckSaveButton: true },
      mocks: { $t: (k) => k }
    }
  })
  return { wrapper, config }
}

// Node.compareDocumentPosition returns a bitmask; DOCUMENT_POSITION_FOLLOWING
// (4) is set on `b` when `a` precedes it in document order.
function precedes(a, b) {
  return !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
}

describe('TabReviewPacing — section order [obligation]', () => {
  test('renders the Cards section before the pacing section [obligation]', () => {
    const { wrapper } = makeWrapper()
    const sections = wrapper.findAll('[data-testid="labeled-section"]')
    const cards_section = sections[0].element
    const pacing_section = wrapper.find('[data-testid="pacing-section-stub"]').element

    expect(precedes(cards_section, pacing_section)).toBe(true)
  })

  test('renders the pacing-section', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="pacing-section-stub"]').exists()).toBe(true)
  })

  test('no longer renders its own divider — the divider moved under the pacing-section header [obligation]', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="ui-kit-divider"]').exists()).toBe(false)
  })
})

describe('TabReviewPacing — behavior toggles', () => {
  test('renders two behavior toggles', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.findAllComponents(ToggleStub)).toHaveLength(2)
  })

  test('updates config.shuffle when shuffle toggle changes', async () => {
    const { wrapper, config } = makeWrapper()
    const toggles = wrapper.findAllComponents(ToggleStub)
    toggles[0].vm.$emit('update:checked', true)
    await wrapper.vm.$nextTick()
    expect(config.shuffle).toBe(true)
  })

  test('updates config.flip_cards from the flip-cards toggle', async () => {
    const { wrapper, config } = makeWrapper()
    const toggles = wrapper.findAllComponents(ToggleStub)
    toggles[1].vm.$emit('update:checked', true)
    await wrapper.vm.$nextTick()
    expect(config.flip_cards).toBe(true)
  })
})

describe('TabReviewPacing — deck-save-button gated on layout_mode', () => {
  test('renders the save button when layout_mode is "sheet"', () => {
    const { wrapper } = makeWrapper({ layout_mode: 'sheet' })
    expect(wrapper.findComponent({ name: 'DeckSaveButton' }).exists()).toBe(true)
  })

  test('omits the save button for other layout modes', () => {
    const { wrapper } = makeWrapper({ layout_mode: 'modal' })
    expect(wrapper.findComponent({ name: 'DeckSaveButton' }).exists()).toBe(false)
  })
})
