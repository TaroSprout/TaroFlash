import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { pacingFieldsKey } from '@/views/deck/deck-settings/tab-review-pacing/pacing-fields'
import PresetChip from '@/views/deck/deck-settings/tab-review-pacing/preset-chip.vue'

// ── Stub ──────────────────────────────────────────────────────────────────────

const DropdownButtonStub = defineComponent({
  name: 'UiDropdownButton',
  inheritAttrs: false,
  props: { options: { type: Array, default: () => [] } },
  emits: ['select'],
  setup(props, { emit, slots, attrs }) {
    return () =>
      h('div', { ...attrs, 'data-testid': 'preset-chip' }, [
        h('span', { 'data-testid': 'preset-chip__label' }, slots.default?.()),
        ...props.options.map((option) =>
          h(
            'button',
            {
              key: option.value,
              'data-testid': `preset-chip__option-${option.value}`,
              onClick: () => emit('select', option)
            },
            option.label
          )
        )
      ])
  }
})

// ── Fixture ───────────────────────────────────────────────────────────────────

const PRESET_OPTIONS = [
  { value: '1', label: 'Default' },
  { value: '2', label: 'Aggressive' }
]

function makeWrapper({ selected = '1' } = {}) {
  const selected_preset_value = ref(selected)
  const pacing_fields = {
    preset_options: ref(PRESET_OPTIONS),
    selected_preset_value
  }
  const wrapper = mount(PresetChip, {
    global: {
      provide: { [pacingFieldsKey]: pacing_fields },
      stubs: { UiDropdownButton: DropdownButtonStub }
    }
  })
  return { wrapper, selected_preset_value }
}

// ── rendering ─────────────────────────────────────────────────────────────────

describe('PresetChip — rendering', () => {
  test('forwards preset_options to the dropdown as its options', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.findComponent(DropdownButtonStub).props('options')).toEqual(PRESET_OPTIONS)
  })

  test('displays the label of the currently selected preset', () => {
    const { wrapper } = makeWrapper({ selected: '2' })
    expect(wrapper.find('[data-testid="preset-chip__label"]').text()).toBe('Aggressive')
  })

  test('updates the displayed label when selected_preset_value changes', async () => {
    const { wrapper, selected_preset_value } = makeWrapper({ selected: '1' })
    expect(wrapper.find('[data-testid="preset-chip__label"]').text()).toBe('Default')

    selected_preset_value.value = '2'
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="preset-chip__label"]').text()).toBe('Aggressive')
  })
})

// ── selection [obligation] ─────────────────────────────────────────────────────

describe('PresetChip — selecting an option [obligation]', () => {
  test('selecting an option writes its value to selected_preset_value [obligation]', async () => {
    const { wrapper, selected_preset_value } = makeWrapper({ selected: '1' })

    await wrapper.find('[data-testid="preset-chip__option-2"]').trigger('click')

    expect(selected_preset_value.value).toBe('2')
  })
})
