import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref, useAttrs } from 'vue'
import { pacingFieldsKey } from '@/views/deck/deck-settings/tab-review-pacing/use-pacing-fields'
import SchedulingSection from '@/views/deck/deck-settings/tab-review-pacing/scheduling-section.vue'

// ── Stubs ─────────────────────────────────────────────────────────────────────
// AdvancedReveal owns its own reveal chrome (scrim/badge/persistence), covered
// directly in advanced-reveal.test.js — here it's a pass-through so this suite
// stays scoped to the field list scheduling-section renders into its slot.

const AdvancedRevealStub = defineComponent({
  name: 'AdvancedReveal',
  setup:
    (_props, { slots }) =>
    () =>
      h('div', { 'data-testid': 'advanced-reveal-stub' }, slots.default?.())
})

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
          'data-suffix': props.suffix,
          'data-min': String(props.min),
          'data-max': String(props.max)
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

function makeField({ value = 0, overridden = false, reset = () => {} } = {}) {
  return { value: ref(value), overridden: ref(overridden), reset }
}

function makePacingFields(fieldOverrides = {}) {
  return {
    fields: {
      desired_retention: makeField({ value: 90 }),
      max_interval: makeField({ value: 0 }),
      leech_threshold: makeField({ value: 24 }),
      learning_steps: {
        ...makeField({ value: '1m-10m' }),
        options: ref([{ value: '1m-10m', label: 'label' }])
      },
      relearning_steps: {
        ...makeField({ value: '10m' }),
        options: ref([{ value: '10m', label: 'label' }])
      },
      ...fieldOverrides
    }
  }
}

function makeWrapper({ fieldOverrides = {} } = {}) {
  const pacing_fields = makePacingFields(fieldOverrides)
  const wrapper = mount(SchedulingSection, {
    global: {
      provide: { [pacingFieldsKey]: pacing_fields },
      stubs: {
        AdvancedReveal: AdvancedRevealStub,
        UiSelectMenu: SelectMenuStub,
        UiSpinbox: SpinboxStub
      },
      mocks: { $t: (k) => k }
    }
  })
  return { wrapper, pacing_fields }
}

// ── rendering ─────────────────────────────────────────────────────────────────

describe('SchedulingSection — rendering', () => {
  test('renders retention, max-interval, leech-threshold, learning-steps, and relearning-steps rows inside the advanced-reveal slot', () => {
    const { wrapper } = makeWrapper()
    const slot = wrapper.find('[data-testid="advanced-reveal-stub"]')
    expect(slot.find('[data-testid="tab-review-pacing__retention"]').exists()).toBe(true)
    expect(slot.find('[data-testid="tab-review-pacing__max-interval"]').exists()).toBe(true)
    expect(slot.find('[data-testid="tab-review-pacing__leech-threshold"]').exists()).toBe(true)
    expect(slot.find('[data-testid="tab-review-pacing__learning-steps"]').exists()).toBe(true)
    expect(slot.find('[data-testid="tab-review-pacing__relearning-steps"]').exists()).toBe(true)
  })

  test('caps the retention spinbox at DESIRED_RETENTION_BOUNDS (70-97) [obligation]', () => {
    const { wrapper } = makeWrapper()
    const spinbox = wrapper.find(
      '[data-testid="tab-review-pacing__retention"] [data-testid="ui-spinbox"]'
    )
    expect(spinbox.attributes('data-min')).toBe('70')
    expect(spinbox.attributes('data-max')).toBe('97')
  })
})

// ── learning-steps / relearning-steps ─────────────────────────────────────────

describe('SchedulingSection — learning-steps / relearning-steps', () => {
  test('selecting a learning-steps key writes through fields.learning_steps.value', async () => {
    const { wrapper, pacing_fields } = makeWrapper()

    await wrapper
      .find('[data-testid="tab-review-pacing__learning-steps"] [data-testid="ui-select-menu"]')
      .setValue('1m-10m')

    expect(pacing_fields.fields.learning_steps.value.value).toBe('1m-10m')
  })

  test('selecting a relearning-steps key writes through fields.relearning_steps.value', async () => {
    const { wrapper, pacing_fields } = makeWrapper()

    await wrapper
      .find('[data-testid="tab-review-pacing__relearning-steps"] [data-testid="ui-select-menu"]')
      .setValue('10m')

    expect(pacing_fields.fields.relearning_steps.value.value).toBe('10m')
  })
})

// ── spinbox writes ────────────────────────────────────────────────────────────

describe('SchedulingSection — spinbox writes', () => {
  test('bumping the retention spinbox writes through fields.desired_retention.value', async () => {
    const { wrapper, pacing_fields } = makeWrapper()

    await wrapper
      .find('[data-testid="tab-review-pacing__retention"] [data-testid="ui-spinbox__increment"]')
      .trigger('click')

    expect(pacing_fields.fields.desired_retention.value.value).toBe(91)
  })

  test('bumping the max-interval spinbox writes through fields.max_interval.value', async () => {
    const { wrapper, pacing_fields } = makeWrapper()

    await wrapper
      .find('[data-testid="tab-review-pacing__max-interval"] [data-testid="ui-spinbox__increment"]')
      .trigger('click')

    expect(pacing_fields.fields.max_interval.value.value).toBe(1)
  })

  test('bumping the leech-threshold spinbox writes through fields.leech_threshold.value', async () => {
    const { wrapper, pacing_fields } = makeWrapper()

    await wrapper
      .find(
        '[data-testid="tab-review-pacing__leech-threshold"] [data-testid="ui-spinbox__increment"]'
      )
      .trigger('click')

    expect(pacing_fields.fields.leech_threshold.value.value).toBe(25)
  })
})

// ── reset wiring [obligation] ──────────────────────────────────────────────────

describe('SchedulingSection — reset wiring [obligation]', () => {
  test('resetting the max-interval row calls fields.max_interval.reset [obligation]', async () => {
    const resetMaxInterval = vi.fn()
    const { wrapper } = makeWrapper({
      fieldOverrides: {
        max_interval: makeField({ overridden: true, reset: resetMaxInterval })
      }
    })

    await wrapper
      .find('[data-testid="tab-review-pacing__max-interval"] [data-testid="field-row__reset"]')
      .trigger('click')

    expect(resetMaxInterval).toHaveBeenCalledOnce()
  })

  test('resetting the leech-threshold row calls fields.leech_threshold.reset [obligation]', async () => {
    const resetLeechThreshold = vi.fn()
    const { wrapper } = makeWrapper({
      fieldOverrides: {
        leech_threshold: makeField({ overridden: true, reset: resetLeechThreshold })
      }
    })

    await wrapper
      .find('[data-testid="tab-review-pacing__leech-threshold"] [data-testid="field-row__reset"]')
      .trigger('click')

    expect(resetLeechThreshold).toHaveBeenCalledOnce()
  })
})
