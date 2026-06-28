import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import ReviewRatingsToggle from '@/components/modals/deck-settings/tab-study/review-ratings-toggle.vue'

// ── OptionGroup stub ──────────────────────────────────────────────────────────
// Renders each option as a clickable button carrying data-active so tests can
// assert the active selection without mounting the full UiOptionGroup chain.

const OptionGroupStub = defineComponent({
  name: 'UiOptionGroup',
  props: { options: Array, value: String },
  emits: ['update:value'],
  setup(props, { emit }) {
    return () =>
      h(
        'div',
        { 'data-testid': 'review-ratings-toggle' },
        (props.options ?? []).map((opt) =>
          h(
            'button',
            {
              key: opt.value,
              'data-testid': `option-${opt.value}`,
              'data-active': String(opt.value === props.value),
              onClick: () => emit('update:value', opt.value)
            },
            opt.label
          )
        )
      )
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountToggle(modelValue) {
  const wrapper = shallowMount(ReviewRatingsToggle, {
    props: {
      value: modelValue,
      'onUpdate:value': (v) => wrapper.setProps({ value: v })
    },
    global: { stubs: { UiOptionGroup: OptionGroupStub } }
  })
  return wrapper
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ReviewRatingsToggle', () => {
  // ── Boolean → active option mapping [obligation] ──────────────────────────

  test('v-model:value=false → "simple" option is active [obligation]', () => {
    const wrapper = mountToggle(false)
    expect(wrapper.find('[data-testid="option-simple"]').attributes('data-active')).toBe('true')
    expect(wrapper.find('[data-testid="option-advanced"]').attributes('data-active')).toBe('false')
  })

  test('v-model:value=true → "advanced" option is active [obligation]', () => {
    const wrapper = mountToggle(true)
    expect(wrapper.find('[data-testid="option-advanced"]').attributes('data-active')).toBe('true')
    expect(wrapper.find('[data-testid="option-simple"]').attributes('data-active')).toBe('false')
  })

  // ── Selecting an option emits the correct boolean [obligation] ────────────

  test('selecting "advanced" emits update:value with true [obligation]', async () => {
    const wrapper = mountToggle(false)
    await wrapper.find('[data-testid="option-advanced"]').trigger('click')
    expect(wrapper.emitted('update:value')).toHaveLength(1)
    expect(wrapper.emitted('update:value')[0][0]).toBe(true)
  })

  test('selecting "simple" emits update:value with false [obligation]', async () => {
    const wrapper = mountToggle(true)
    await wrapper.find('[data-testid="option-simple"]').trigger('click')
    expect(wrapper.emitted('update:value')).toHaveLength(1)
    expect(wrapper.emitted('update:value')[0][0]).toBe(false)
  })

  // ── Model reactivity ──────────────────────────────────────────────────────

  test('changing model value from false to true switches active to advanced', async () => {
    const wrapper = mountToggle(false)
    expect(wrapper.find('[data-testid="option-simple"]').attributes('data-active')).toBe('true')

    await wrapper.find('[data-testid="option-advanced"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="option-advanced"]').attributes('data-active')).toBe('true')
    expect(wrapper.find('[data-testid="option-simple"]').attributes('data-active')).toBe('false')
  })

  // ── Renders both option labels ─────────────────────────────────────────────

  test('renders both simple and advanced options', () => {
    const wrapper = mountToggle(false)
    expect(wrapper.find('[data-testid="option-simple"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="option-advanced"]').exists()).toBe(true)
  })
})
