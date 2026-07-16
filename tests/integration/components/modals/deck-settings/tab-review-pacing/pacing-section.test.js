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

import PacingSection from '@/views/deck/deck-settings/tab-review-pacing/pacing-section.vue'

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
  props: { value: { type: Number, required: true }, min: Number, max: Number },
  emits: ['update:value'],
  inheritAttrs: false,
  setup(props, { emit }) {
    const attrs = useAttrs()
    return () =>
      h('div', { ...attrs, 'data-testid': 'ui-spinbox', 'data-value': String(props.value) }, [
        h(
          'button',
          {
            'data-testid': 'ui-spinbox__increment',
            onClick: () => emit('update:value', props.value + 1)
          },
          '+'
        )
      ])
  }
})

const ButtonStub = defineComponent({
  name: 'UiButton',
  emits: ['press'],
  inheritAttrs: false,
  setup(_props, { slots, emit }) {
    const attrs = useAttrs()
    return () => h('button', { ...attrs, onClick: () => emit('press') }, slots.default?.())
  }
})

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SYSTEM_PRESET = {
  id: 1,
  name: 'Recommended',
  is_system: true,
  desired_retention: 90,
  learning_steps: ['1m', '10m'],
  relearning_steps: ['10m']
}

const CUSTOM_PRESET = {
  id: 2,
  name: 'Aggressive',
  is_system: false,
  desired_retention: 95,
  learning_steps: ['1m'],
  relearning_steps: ['1d']
}

function makeWrapper({ deck: deckOverrides = {}, pacingOverrides = {} } = {}) {
  const deck = {
    id: 1,
    desired_retention: 90,
    learning_steps: ['1m', '10m'],
    relearning_steps: ['10m'],
    ...deckOverrides
  }
  const pacing = reactive({
    preset_id: null,
    desired_retention_override: null,
    learning_steps_override: null,
    relearning_steps_override: null,
    ...pacingOverrides
  })
  const editor = { deck, pacing }
  const wrapper = mount(PacingSection, {
    global: {
      provide: { [deckEditorKey]: editor },
      stubs: { UiSelectMenu: SelectMenuStub, UiSpinbox: SpinboxStub, UiButton: ButtonStub },
      mocks: { $t: (k) => k }
    }
  })
  return { wrapper, deck, pacing }
}

beforeEach(() => {
  mockPresetsData.value = [SYSTEM_PRESET, CUSTOM_PRESET]
})

describe('PacingSection — rendering', () => {
  test('renders the preset, retention, learning-steps, and relearning-steps rows', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="tab-review-pacing__preset"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tab-review-pacing__retention"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tab-review-pacing__learning-steps"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tab-review-pacing__relearning-steps"]').exists()).toBe(true)
  })

  test('retention spinbox reflects the deck-resolved value when not overridden', () => {
    const { wrapper } = makeWrapper({ deck: { desired_retention: 90 } })
    const spinbox = wrapper.find(
      '[data-testid="tab-review-pacing__retention"] [data-testid="ui-spinbox"]'
    )
    expect(spinbox.attributes('data-value')).toBe('90')
  })

  test('retention spinbox reflects the override when set', () => {
    const { wrapper } = makeWrapper({ pacingOverrides: { desired_retention_override: 82 } })
    const spinbox = wrapper.find(
      '[data-testid="tab-review-pacing__retention"] [data-testid="ui-spinbox"]'
    )
    expect(spinbox.attributes('data-value')).toBe('82')
  })
})

describe('PacingSection — reset-to-preset button [obligation]', () => {
  test('is hidden when nothing is overridden', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="tab-review-pacing__reset-overrides"]').exists()).toBe(false)
  })

  test('is visible when any field is overridden', () => {
    const { wrapper } = makeWrapper({ pacingOverrides: { desired_retention_override: 82 } })
    expect(wrapper.find('[data-testid="tab-review-pacing__reset-overrides"]').exists()).toBe(true)
  })

  test('clicking it clears every override field back to null [obligation]', async () => {
    const { wrapper, pacing } = makeWrapper({
      pacingOverrides: {
        desired_retention_override: 82,
        learning_steps_override: ['1d'],
        relearning_steps_override: ['1d']
      }
    })

    await wrapper.find('[data-testid="tab-review-pacing__reset-overrides"]').trigger('click')

    expect(pacing.desired_retention_override).toBeNull()
    expect(pacing.learning_steps_override).toBeNull()
    expect(pacing.relearning_steps_override).toBeNull()
  })
})

describe('PacingSection — editing controls pins overrides [obligation]', () => {
  test('bumping the retention spinbox writes to pacing.desired_retention_override [obligation]', async () => {
    const { wrapper, pacing } = makeWrapper({ deck: { desired_retention: 90 } })

    await wrapper
      .find('[data-testid="tab-review-pacing__retention"] [data-testid="ui-spinbox__increment"]')
      .trigger('click')

    expect(pacing.desired_retention_override).toBe(91)
  })

  test('selecting a preset in the picker writes to pacing.preset_id [obligation]', async () => {
    const { wrapper, pacing } = makeWrapper()

    await wrapper
      .find('[data-testid="tab-review-pacing__preset"] [data-testid="ui-select-menu"]')
      .setValue('2')

    expect(pacing.preset_id).toBe(2)
  })

  test('selecting the system preset writes null (not its literal id) to pacing.preset_id [obligation]', async () => {
    const { wrapper, pacing } = makeWrapper({ pacingOverrides: { preset_id: 2 } })

    await wrapper
      .find('[data-testid="tab-review-pacing__preset"] [data-testid="ui-select-menu"]')
      .setValue('1')

    expect(pacing.preset_id).toBeNull()
  })

  test('changing the learning-steps select writes to pacing.learning_steps_override [obligation]', async () => {
    const { wrapper, pacing } = makeWrapper({ deck: { learning_steps: ['1m', '10m'] } })

    await wrapper
      .find('[data-testid="tab-review-pacing__learning-steps"] [data-testid="ui-select-menu"]')
      .setValue('1d')

    expect(pacing.learning_steps_override).toEqual(['1d'])
  })

  test('changing the relearning-steps select writes to pacing.relearning_steps_override [obligation]', async () => {
    const { wrapper, pacing } = makeWrapper({ deck: { relearning_steps: ['10m'] } })

    await wrapper
      .find('[data-testid="tab-review-pacing__relearning-steps"] [data-testid="ui-select-menu"]')
      .setValue('1d')

    expect(pacing.relearning_steps_override).toEqual(['1d'])
  })
})
