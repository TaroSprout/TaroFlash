import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, reactive, ref, useAttrs } from 'vue'
import { deckEditorKey } from '@/composables/deck/editor'

// pacing-section.vue owns the preset picker + retention/steps controls and
// has its own dedicated test file (pacing-section.test.js) — stub it out
// here so this suite only exercises the toggles + daily-limit rows that
// live directly in tab-review-pacing/index.vue.
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

const IconStub = defineComponent({
  name: 'UiIcon',
  props: ['src'],
  setup(p) {
    return () => h('span', { 'data-testid': 'ui-icon', 'data-src': p.src })
  }
})

const SpinboxStub = defineComponent({
  name: 'UiSpinbox',
  props: {
    value: { type: Number, required: true },
    min: { type: Number, default: -Infinity },
    max: { type: Number, default: Infinity },
    step: { type: Number, default: 1 },
    pill_label: { type: String, default: undefined },
    pill_active: { type: Boolean, default: false }
  },
  emits: ['update:value', 'update:pill_active'],
  inheritAttrs: false,
  setup(props, { emit }) {
    const attrs = useAttrs()
    return () =>
      h(
        'div',
        {
          ...attrs,
          'data-testid': 'ui-kit-spinbox',
          'data-value': String(props.value),
          'data-min': String(props.min),
          'data-max': String(props.max),
          'data-step': String(props.step)
        },
        [
          h(
            'button',
            {
              type: 'button',
              'data-testid': 'ui-kit-spinbox__decrement',
              onClick: () => emit('update:value', Math.max(props.min, props.value - props.step))
            },
            '-'
          ),
          h(
            'button',
            {
              type: 'button',
              'data-testid': 'ui-kit-spinbox__increment',
              onClick: () => emit('update:value', Math.min(props.max, props.value + props.step))
            },
            '+'
          ),
          props.pill_label
            ? h(
                'button',
                {
                  type: 'button',
                  'data-testid': 'ui-kit-spinbox__all-pill',
                  'data-active': String(!!props.pill_active),
                  onClick: () => emit('update:pill_active', !props.pill_active)
                },
                props.pill_label
              )
            : null
        ]
      )
  }
})

function makeTabReviewPacing({ config: initial = {}, card_count } = {}) {
  const config = reactive({ ...initial })
  const editor = {
    deck: card_count !== undefined ? { card_count } : undefined,
    config,
    pacing: reactive({
      preset_id: null,
      desired_retention_override: null,
      learning_steps_override: null,
      relearning_steps_override: null
    }),
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
      provide: { [deckEditorKey]: editor },
      stubs: { UiToggle: ToggleStub, UiIcon: IconStub, UiSpinbox: SpinboxStub },
      mocks: { $t: (k) => k }
    }
  })
  return { wrapper, config }
}

function rowSpinbox(wrapper, row) {
  return wrapper.find(`[data-testid="${row}"] [data-testid="ui-kit-spinbox"]`)
}

function rowAllToggle(wrapper, row) {
  return wrapper.find(`[data-testid="${row}"] [data-testid="ui-kit-spinbox__all-pill"]`)
}

describe('TabReviewPacing', () => {
  test('renders the pacing-section (preset + retention/steps controls)', () => {
    const { wrapper } = makeTabReviewPacing()
    expect(wrapper.find('[data-testid="pacing-section-stub"]').exists()).toBe(true)
  })

  test('renders two behavior toggles', () => {
    const { wrapper } = makeTabReviewPacing()
    expect(wrapper.findAllComponents(ToggleStub)).toHaveLength(2)
  })

  test('renders two "all" pills (one per daily limit)', () => {
    const { wrapper } = makeTabReviewPacing()
    expect(wrapper.findAll('[data-testid="ui-kit-spinbox__all-pill"]')).toHaveLength(2)
  })

  test('renders a spinbox for each daily limit', () => {
    const { wrapper } = makeTabReviewPacing()
    expect(wrapper.findAll('[data-testid="ui-kit-spinbox"]')).toHaveLength(2)
  })

  test('updates config.shuffle when shuffle toggle changes', async () => {
    const { wrapper, config } = makeTabReviewPacing({ config: { shuffle: false } })
    const toggles = wrapper.findAllComponents(ToggleStub)
    toggles[0].vm.$emit('update:checked', true)
    await wrapper.vm.$nextTick()
    expect(config.shuffle).toBe(true)
  })

  test('updates config.flip_cards from the flip-cards toggle', async () => {
    const { wrapper, config } = makeTabReviewPacing({ config: { flip_cards: false } })
    const toggles = wrapper.findAllComponents(ToggleStub)
    toggles[1].vm.$emit('update:checked', true)
    await wrapper.vm.$nextTick()
    expect(config.flip_cards).toBe(true)
  })

  test('reviews spinbox is configured: step 5, min 5, max 200', () => {
    const { wrapper } = makeTabReviewPacing({ config: { max_reviews_per_day: 50 } })
    const spinbox = rowSpinbox(wrapper, 'tab-review-pacing__max-reviews')
    expect(spinbox.attributes('data-step')).toBe('5')
    expect(spinbox.attributes('data-min')).toBe('5')
    expect(spinbox.attributes('data-max')).toBe('200')
    expect(spinbox.attributes('data-value')).toBe('50')
  })

  test('new spinbox is configured: step 5, min 5, max 100', () => {
    const { wrapper } = makeTabReviewPacing({ config: { max_new_per_day: 10 } })
    const spinbox = rowSpinbox(wrapper, 'tab-review-pacing__max-new')
    expect(spinbox.attributes('data-step')).toBe('5')
    expect(spinbox.attributes('data-min')).toBe('5')
    expect(spinbox.attributes('data-max')).toBe('100')
    expect(spinbox.attributes('data-value')).toBe('10')
  })

  test('incrementing reviews spinbox writes a stepped value to config', async () => {
    const { wrapper, config } = makeTabReviewPacing({ config: { max_reviews_per_day: 50 } })
    await wrapper
      .find(
        '[data-testid="tab-review-pacing__max-reviews"] [data-testid="ui-kit-spinbox__increment"]'
      )
      .trigger('click')
    expect(config.max_reviews_per_day).toBe(55)
  })

  test('reaching reviews max sets max_reviews_per_day to null (switches to all)', async () => {
    const { wrapper, config } = makeTabReviewPacing({ config: { max_reviews_per_day: 195 } })
    await wrapper
      .find(
        '[data-testid="tab-review-pacing__max-reviews"] [data-testid="ui-kit-spinbox__increment"]'
      )
      .trigger('click')
    expect(config.max_reviews_per_day).toBeNull()
  })

  test('reaching new-per-day max sets max_new_per_day to null (switches to all)', async () => {
    const { wrapper, config } = makeTabReviewPacing({ config: { max_new_per_day: 95 } })
    await wrapper
      .find('[data-testid="tab-review-pacing__max-new"] [data-testid="ui-kit-spinbox__increment"]')
      .trigger('click')
    expect(config.max_new_per_day).toBeNull()
  })

  test('clicking the reviews "all" pill from numeric sets the value to null', async () => {
    const { wrapper, config } = makeTabReviewPacing({ config: { max_reviews_per_day: 50 } })
    await rowAllToggle(wrapper, 'tab-review-pacing__max-reviews').trigger('click')
    expect(config.max_reviews_per_day).toBeNull()
  })

  test('clicking the new "all" pill from null restores a numeric value', async () => {
    const { wrapper, config } = makeTabReviewPacing({ config: { max_new_per_day: null } })
    await rowAllToggle(wrapper, 'tab-review-pacing__max-new').trigger('click')
    expect(typeof config.max_new_per_day).toBe('number')
    expect(config.max_new_per_day).toBeGreaterThan(0)
  })

  test('clicking reviews "all" pre-fills the spinbox with card_count', async () => {
    const { wrapper } = makeTabReviewPacing({
      config: { max_reviews_per_day: 50 },
      card_count: 137
    })
    await rowAllToggle(wrapper, 'tab-review-pacing__max-reviews').trigger('click')
    expect(rowSpinbox(wrapper, 'tab-review-pacing__max-reviews').attributes('data-value')).toBe(
      '137'
    )
  })

  test('clicking new "all" pre-fills the spinbox with card_count', async () => {
    const { wrapper } = makeTabReviewPacing({
      config: { max_new_per_day: 10 },
      card_count: 42
    })
    await rowAllToggle(wrapper, 'tab-review-pacing__max-new').trigger('click')
    expect(rowSpinbox(wrapper, 'tab-review-pacing__max-new').attributes('data-value')).toBe('42')
  })

  test('clicking "all" without card_count leaves spinbox value unchanged', async () => {
    const { wrapper } = makeTabReviewPacing({ config: { max_reviews_per_day: 50 } })
    await rowAllToggle(wrapper, 'tab-review-pacing__max-reviews').trigger('click')
    expect(rowSpinbox(wrapper, 'tab-review-pacing__max-reviews').attributes('data-value')).toBe(
      '50'
    )
  })

  test('clicking reviews "all" twice restores the last numeric local value', async () => {
    const { wrapper, config } = makeTabReviewPacing({ config: { max_reviews_per_day: 75 } })
    const pill = rowAllToggle(wrapper, 'tab-review-pacing__max-reviews')
    await pill.trigger('click')
    await pill.trigger('click')
    expect(config.max_reviews_per_day).toBe(75)
  })

  test('decrementing from null state turns "all" off and writes a numeric value', async () => {
    const { wrapper, config } = makeTabReviewPacing({ config: { max_reviews_per_day: null } })
    await wrapper
      .find(
        '[data-testid="tab-review-pacing__max-reviews"] [data-testid="ui-kit-spinbox__decrement"]'
      )
      .trigger('click')
    expect(typeof config.max_reviews_per_day).toBe('number')
    expect(config.max_reviews_per_day).toBeLessThan(200)
  })

  test('external prop change to null updates the "all" toggle state', async () => {
    const { wrapper, config } = makeTabReviewPacing({ config: { max_reviews_per_day: 50 } })
    config.max_reviews_per_day = null
    await wrapper.vm.$nextTick()
    expect(rowAllToggle(wrapper, 'tab-review-pacing__max-reviews').attributes('data-active')).toBe(
      'true'
    )
  })

  test('external prop change to a number updates the spinbox value', async () => {
    const { wrapper, config } = makeTabReviewPacing({ config: { max_new_per_day: 10 } })
    config.max_new_per_day = 80
    await wrapper.vm.$nextTick()
    expect(rowSpinbox(wrapper, 'tab-review-pacing__max-new').attributes('data-value')).toBe('80')
  })

  test('the "all" toggles reflect null state via data-checked', () => {
    const { wrapper } = makeTabReviewPacing({
      config: { max_reviews_per_day: null, max_new_per_day: 20 }
    })
    expect(rowAllToggle(wrapper, 'tab-review-pacing__max-reviews').attributes('data-active')).toBe(
      'true'
    )
    expect(rowAllToggle(wrapper, 'tab-review-pacing__max-new').attributes('data-active')).toBe(
      'false'
    )
  })
})
