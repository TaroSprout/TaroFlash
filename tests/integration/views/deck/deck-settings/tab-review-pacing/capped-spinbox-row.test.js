import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'
import CappedSpinboxRow from '@/views/deck/deck-settings/tab-review-pacing/capped-spinbox-row.vue'
import TooltipRow from '@/views/deck/deck-settings/tab-review-pacing/tooltip-row.vue'
import UiTooltip from '@/components/ui-kit/tooltip.vue'

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

const DEFAULTS = {
  label: 'Reviews',
  all_label: 'All',
  min: 5,
  max: 200,
  step: 5,
  default_value: 50
}

function makeRow(overrides = {}) {
  const props = { ...DEFAULTS, ...overrides }
  let modelValue = props.value
  const wrapper = mount(CappedSpinboxRow, {
    props: {
      ...props,
      'onUpdate:value': (v) => {
        modelValue = v
        wrapper.setProps({ value: v })
      }
    },
    global: {
      stubs: { UiSpinbox: SpinboxStub }
    }
  })
  return { wrapper, getValue: () => modelValue }
}

describe('CappedSpinboxRow', () => {
  test('renders the label and the all-pill label via tooltip-row', () => {
    const { wrapper } = makeRow({ label: 'Max reviews', all_label: 'Unlimited' })
    expect(wrapper.find('[data-testid="tooltip-row__label"]').text()).toContain('Max reviews')
    expect(wrapper.find('[data-testid="ui-kit-spinbox__all-pill"]').text()).toContain('Unlimited')
  })

  test('passes the tooltip prop through to tooltip-row', () => {
    const { wrapper } = makeRow({ tooltip: 'Caps daily review count' })
    expect(wrapper.findComponent(TooltipRow).props('tooltip')).toBe('Caps daily review count')
  })

  test('omits the tooltip icon when no tooltip prop is given', () => {
    const { wrapper } = makeRow()
    expect(wrapper.findComponent(UiTooltip).exists()).toBe(false)
  })

  test('passes min/max/step through to the spinbox', () => {
    const { wrapper } = makeRow({ value: 50, min: 5, max: 200, step: 5 })
    const spinbox = wrapper.find('[data-testid="ui-kit-spinbox"]')
    expect(spinbox.attributes('data-min')).toBe('5')
    expect(spinbox.attributes('data-max')).toBe('200')
    expect(spinbox.attributes('data-step')).toBe('5')
    expect(spinbox.attributes('data-value')).toBe('50')
  })

  test('seeds spinbox from max when value is null and prefill_when_all is unset', () => {
    const { wrapper } = makeRow({ value: null, max: 200 })
    expect(wrapper.find('[data-testid="ui-kit-spinbox"]').attributes('data-value')).toBe('200')
  })

  test('seeds spinbox from prefill_when_all when value is null', () => {
    const { wrapper } = makeRow({ value: null, prefill_when_all: 137, max: 200 })
    expect(wrapper.find('[data-testid="ui-kit-spinbox"]').attributes('data-value')).toBe('137')
  })

  test('marks the all-pill active when value is null', () => {
    const { wrapper } = makeRow({ value: null })
    expect(wrapper.find('[data-testid="ui-kit-spinbox__all-pill"]').attributes('data-active')).toBe(
      'true'
    )
  })

  test('incrementing the spinbox emits update:value with the stepped number', async () => {
    const { wrapper, getValue } = makeRow({ value: 50, step: 5 })
    await wrapper.find('[data-testid="ui-kit-spinbox__increment"]').trigger('click')
    expect(getValue()).toBe(55)
  })

  test('reaching max emits null (switches to "all")', async () => {
    const { wrapper, getValue } = makeRow({ value: 195, step: 5, max: 200 })
    await wrapper.find('[data-testid="ui-kit-spinbox__increment"]').trigger('click')
    expect(getValue()).toBeNull()
  })

  test('clicking the all-pill from a numeric value emits null', async () => {
    const { wrapper, getValue } = makeRow({ value: 50 })
    await wrapper.find('[data-testid="ui-kit-spinbox__all-pill"]').trigger('click')
    expect(getValue()).toBeNull()
  })

  test('clicking the all-pill from null restores a numeric value', async () => {
    const { wrapper, getValue } = makeRow({ value: null, default_value: 50 })
    await wrapper.find('[data-testid="ui-kit-spinbox__all-pill"]').trigger('click')
    expect(typeof getValue()).toBe('number')
    expect(getValue()).toBeGreaterThan(0)
  })

  test('clicking the all-pill on with prefill_when_all sets the spinbox to that value', async () => {
    const { wrapper } = makeRow({ value: 50, prefill_when_all: 137 })
    await wrapper.find('[data-testid="ui-kit-spinbox__all-pill"]').trigger('click')
    expect(wrapper.find('[data-testid="ui-kit-spinbox"]').attributes('data-value')).toBe('137')
  })
})
