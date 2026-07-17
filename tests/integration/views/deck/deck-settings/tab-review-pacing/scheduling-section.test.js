import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, reactive, useAttrs } from 'vue'
import { deckEditorKey } from '@/composables/deck/editor'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockPresetsData } = vi.hoisted(() => ({
  mockPresetsData: { value: [] }
}))

vi.mock('@/api/review-pacing', () => ({
  usePresetsQuery: () => ({ data: mockPresetsData })
}))

import SchedulingSection from '@/views/deck/deck-settings/tab-review-pacing/scheduling-section.vue'

// ── Stubs ─────────────────────────────────────────────────────────────────────

const SelectMenuStub = defineComponent({
  name: 'UiSelectMenu',
  props: { options: { type: Array, default: () => [] }, modelValue: { type: String, default: '' } },
  emits: ['update:modelValue'],
  inheritAttrs: false,
  setup(props, { emit }) {
    const attrs = useAttrs()
    return () =>
      h(
        'select',
        {
          ...attrs,
          'data-testid': 'ui-select-menu',
          value: props.modelValue,
          onChange: (e) => emit('update:modelValue', e.target.value)
        },
        props.options.map((o) => h('option', { value: o.value }, o.label))
      )
  }
})

const SpinboxStub = defineComponent({
  name: 'UiSpinbox',
  props: { value: { type: Number, required: true }, min: Number, max: Number, suffix: String },
  emits: ['update:value'],
  inheritAttrs: false,
  setup(props, { emit }) {
    const attrs = useAttrs()
    return () =>
      h(
        'div',
        {
          ...attrs,
          'data-testid': 'ui-spinbox',
          'data-value': String(props.value),
          'data-suffix': props.suffix
        },
        [
          h(
            'button',
            {
              'data-testid': 'ui-spinbox__increment',
              onClick: () => emit('update:value', props.value + 1)
            },
            '+'
          )
        ]
      )
  }
})

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeWrapper({ deck: deckOverrides = {}, pacing_overrides = {} } = {}) {
  const deck = {
    id: 1,
    desired_retention: 90,
    leech_threshold: 24,
    max_interval: null,
    learning_steps: ['1m', '10m'],
    relearning_steps: ['10m'],
    ...deckOverrides
  }
  const draft = reactive({
    review_pacing_preset_id: null,
    pacing_overrides: { ...pacing_overrides }
  })
  const editor = { deck, draft }
  const wrapper = mount(SchedulingSection, {
    global: {
      provide: { [deckEditorKey]: editor },
      stubs: { UiSelectMenu: SelectMenuStub, UiSpinbox: SpinboxStub },
      mocks: { $t: (k) => k }
    }
  })
  return { wrapper, deck, draft }
}

beforeEach(() => {
  mockPresetsData.value = []
})

// ── Structure ────────────────────────────────────────────────────────────────

describe('SchedulingSection — rendering', () => {
  test('renders retention, max-interval, leech-threshold, learning-steps, and relearning-steps rows', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="tab-review-pacing__retention"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tab-review-pacing__max-interval"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tab-review-pacing__leech-threshold"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tab-review-pacing__learning-steps"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tab-review-pacing__relearning-steps"]').exists()).toBe(true)
  })
})

// ── learning-steps / relearning-steps ─────────────────────────────────────────

describe('SchedulingSection — learning-steps / relearning-steps', () => {
  test('selecting a learning-steps key pins the learning_steps override', async () => {
    const { wrapper, draft } = makeWrapper()

    await wrapper
      .find('[data-testid="tab-review-pacing__learning-steps"] [data-testid="ui-select-menu"]')
      .setValue('1hr')

    expect(draft.pacing_overrides.learning_steps).toEqual(['1h'])
  })

  test('selecting a relearning-steps key pins the relearning_steps override', async () => {
    const { wrapper, draft } = makeWrapper()

    await wrapper
      .find('[data-testid="tab-review-pacing__relearning-steps"] [data-testid="ui-select-menu"]')
      .setValue('1m-10m')

    expect(draft.pacing_overrides.relearning_steps).toEqual(['1m', '10m'])
  })
})

// ── max-interval [obligation] ─────────────────────────────────────────────────

describe('SchedulingSection — max-interval spinbox [obligation]', () => {
  test('resolves to 0 (uncapped sentinel) when the deck value is null', () => {
    const { wrapper } = makeWrapper({ deck: { max_interval: null } })
    const spinbox = wrapper.find(
      '[data-testid="tab-review-pacing__max-interval"] [data-testid="ui-spinbox"]'
    )
    expect(spinbox.attributes('data-value')).toBe('0')
  })

  test('bumping the spinbox pins the max_interval key in pacing_overrides [obligation]', async () => {
    const { wrapper, draft } = makeWrapper({ deck: { max_interval: null } })

    await wrapper
      .find('[data-testid="tab-review-pacing__max-interval"] [data-testid="ui-spinbox__increment"]')
      .trigger('click')

    expect('max_interval' in draft.pacing_overrides).toBe(true)
    expect(draft.pacing_overrides.max_interval).toBe(1)
  })

  test('passes the max-interval-suffix translation through as the spinbox suffix prop', () => {
    const { wrapper } = makeWrapper()
    const spinbox = wrapper.find(
      '[data-testid="tab-review-pacing__max-interval"] [data-testid="ui-spinbox"]'
    )
    expect(spinbox.attributes('data-suffix')).toBe('d')
  })
})

// ── leech-threshold [obligation] ──────────────────────────────────────────────

describe('SchedulingSection — leech-threshold spinbox [obligation]', () => {
  test('resolves to deck.leech_threshold when no override is set', () => {
    const { wrapper } = makeWrapper({ deck: { leech_threshold: 24 } })
    const spinbox = wrapper.find(
      '[data-testid="tab-review-pacing__leech-threshold"] [data-testid="ui-spinbox"]'
    )
    expect(spinbox.attributes('data-value')).toBe('24')
  })

  test('bumping the spinbox pins the leech_threshold key directly, without a has-gate [obligation]', async () => {
    const { wrapper, draft } = makeWrapper({ deck: { leech_threshold: 24 } })

    await wrapper
      .find(
        '[data-testid="tab-review-pacing__leech-threshold"] [data-testid="ui-spinbox__increment"]'
      )
      .trigger('click')

    expect(draft.pacing_overrides.leech_threshold).toBe(25)
    expect(draft.pacing_overrides).not.toHaveProperty('has_leech_threshold_override')
  })
})

// ── reset wiring [obligation] ──────────────────────────────────────────────────

describe('SchedulingSection — reset wiring [obligation]', () => {
  test('resetting the max-interval row un-pins the override — deletes the key entirely [obligation]', async () => {
    const { wrapper, draft } = makeWrapper({
      pacing_overrides: { max_interval: 90 }
    })

    await wrapper
      .find('[data-testid="tab-review-pacing__max-interval"] [data-testid="tooltip-row__reset"]')
      .trigger('click')

    expect('max_interval' in draft.pacing_overrides).toBe(false)
  })

  test('resetting the leech-threshold row deletes the leech_threshold key [obligation]', async () => {
    const { wrapper, draft } = makeWrapper({ pacing_overrides: { leech_threshold: 12 } })

    await wrapper
      .find('[data-testid="tab-review-pacing__leech-threshold"] [data-testid="tooltip-row__reset"]')
      .trigger('click')

    expect('leech_threshold' in draft.pacing_overrides).toBe(false)
  })
})
