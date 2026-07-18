import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, reactive, ref, useAttrs } from 'vue'
import { deckEditorKey } from '@/composables/deck/editor'
import { windowLayoutKey } from '@/components/layout-kit/paged-window/layout'

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

// Renders one button per option, tagged data-testid="option-<value>", carrying
// data-active — matches the ui-kit convention the real component exposes.
const OptionGroupStub = defineComponent({
  name: 'UiOptionGroup',
  props: { options: { type: Array, default: () => [] }, value: { type: String, default: '' } },
  emits: ['update:value'],
  inheritAttrs: false,
  setup(props, { emit }) {
    const attrs = useAttrs()
    return () =>
      h(
        'div',
        { ...attrs },
        props.options.map((option) =>
          h(
            'button',
            {
              key: option.value,
              'data-testid': `option-${option.value}`,
              'data-active': String(option.value === props.value),
              onClick: () => emit('update:value', option.value)
            },
            option.label
          )
        )
      )
  }
})

function makeWrapper({ config: configOverrides = {}, layout_mode = 'modal' } = {}) {
  const deck = reactive({ id: 1 })
  const draft = reactive({
    study_config: { shuffle: false, ...configOverrides },
    cover_config: {},
    card_attributes: { front: {}, back: {} },
    review_pacing_preset_id: null,
    pacing_overrides: {}
  })
  const editor = {
    deck,
    draft,
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
      provide: { [deckEditorKey]: editor, [windowLayoutKey]: layout_mode },
      stubs: { UiToggle: ToggleStub, UiOptionGroup: OptionGroupStub, DeckSaveButton: true },
      mocks: { $t: (k) => k }
    }
  })
  return { wrapper, config: draft.study_config }
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
  test('renders one behavior toggle (shuffle)', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.findAllComponents(ToggleStub)).toHaveLength(1)
  })

  test('updates config.shuffle when shuffle toggle changes', async () => {
    const { wrapper, config } = makeWrapper()
    const toggles = wrapper.findAllComponents(ToggleStub)
    toggles[0].vm.$emit('update:checked', true)
    await wrapper.vm.$nextTick()
    expect(config.shuffle).toBe(true)
  })
})

describe('TabReviewPacing — starting-side option group [obligation]', () => {
  test('displays "front" as active when draft.study_config.starting_side is absent [obligation]', () => {
    const { wrapper } = makeWrapper()
    const group = wrapper.find('[data-testid="tab-review-pacing__starting-side-options"]')
    expect(group.find('[data-testid="option-front"]').attributes('data-active')).toBe('true')
  })

  test('reflects an existing draft.study_config.starting_side value', () => {
    const { wrapper } = makeWrapper({ config: { starting_side: 'random' } })
    const group = wrapper.find('[data-testid="tab-review-pacing__starting-side-options"]')
    expect(group.find('[data-testid="option-random"]').attributes('data-active')).toBe('true')
  })

  test('writes "back" into draft.study_config.starting_side when the back option is picked [obligation]', async () => {
    const { wrapper, config } = makeWrapper()
    await wrapper.find('[data-testid="option-back"]').trigger('click')
    expect(config.starting_side).toBe('back')
  })

  test('writes "random" into draft.study_config.starting_side when the random option is picked [obligation]', async () => {
    const { wrapper, config } = makeWrapper()
    await wrapper.find('[data-testid="option-random"]').trigger('click')
    expect(config.starting_side).toBe('random')
  })

  test('writes "front" into draft.study_config.starting_side when the front option is picked from a "back" draft [obligation]', async () => {
    const { wrapper, config } = makeWrapper({ config: { starting_side: 'back' } })
    await wrapper.find('[data-testid="option-front"]').trigger('click')
    expect(config.starting_side).toBe('front')
  })

  test('renders the starting-side row wrapper [data-testid]', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="tab-review-pacing__starting-side"]').exists()).toBe(true)
  })
})

// [obligation] This tab claims the whole content area, so the aside that used
// to carry the save button is retracted — the save button now renders
// unconditionally (it used to be gated on layout_mode === 'sheet'), so there's
// still a way to save on desktop/tablet.
describe('TabReviewPacing — renders deck-save-button unconditionally [obligation]', () => {
  test('renders the save button when layout_mode is "sheet"', () => {
    const { wrapper } = makeWrapper({ layout_mode: 'sheet' })
    expect(wrapper.findComponent({ name: 'DeckSaveButton' }).exists()).toBe(true)
  })

  test('renders the save button on desktop/tablet layout modes too', () => {
    const { wrapper } = makeWrapper({ layout_mode: 'modal' })
    expect(wrapper.findComponent({ name: 'DeckSaveButton' }).exists()).toBe(true)
  })
})
