import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockEmitSfx, mockPresetsData } = vi.hoisted(() => ({
  mockEmitSfx: vi.fn(),
  mockPresetsData: { value: [] }
}))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx, emitHoverSfx: vi.fn(), emitStudySfx: vi.fn() }))

vi.mock('@/api/review-pacing', () => ({
  usePresetsQuery: () => ({ data: mockPresetsData })
}))

import AdvancedPacingModal from '@/views/deck/deck-settings/tab-review-pacing/advanced-pacing-modal/index.vue'
import TooltipRow from '@/views/deck/deck-settings/tab-review-pacing/tooltip-row.vue'
import DailyLimits from '@/views/deck/deck-settings/tab-review-pacing/advanced-pacing-modal/daily-limits.vue'
import DialogCard from '@/components/layout-kit/dialog-card/index.vue'

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
          'data-testid': 'ui-select-menu',
          ...attrs,
          value: props.modelValue,
          onChange: (e) => emit('update:modelValue', e.target.value)
        },
        props.options.map((o) => h('option', { value: o.value }, o.label))
      )
  }
})

const SpinboxStub = defineComponent({
  name: 'UiSpinbox',
  props: { value: { type: Number, required: true } },
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
  relearning_steps: ['10m'],
  max_reviews_per_day: 50,
  max_new_per_day: 10
}

function makeWrapper({ deckOverrides = {}, pacingOverrides = {} } = {}) {
  const deck = {
    id: 1,
    desired_retention: 90,
    learning_steps: ['1m', '10m'],
    relearning_steps: ['10m'],
    max_reviews_per_day: 50,
    max_new_per_day: 10,
    ...deckOverrides
  }
  const pacing = {
    preset_id: null,
    desired_retention_override: null,
    learning_steps_override: null,
    relearning_steps_override: null,
    has_max_reviews_override: false,
    max_reviews_per_day_override: null,
    has_max_new_override: false,
    max_new_per_day_override: null,
    ...pacingOverrides
  }
  const close = vi.fn()
  const wrapper = mount(AdvancedPacingModal, {
    props: { deck, pacing, close },
    global: {
      stubs: { UiSelectMenu: SelectMenuStub, UiSpinbox: SpinboxStub, UiButton: ButtonStub }
    }
  })
  return { wrapper, deck, pacing, close }
}

beforeEach(() => {
  mockPresetsData.value = [SYSTEM_PRESET]
  mockEmitSfx.mockClear()
})

describe('AdvancedPacingModal — preset select [obligation]', () => {
  test('renders the preset select-menu in the dialog-card header-end slot [obligation]', () => {
    const { wrapper } = makeWrapper()
    const header_end = wrapper.find('[data-testid="dialog-card-header__end"]')
    expect(header_end.find('[data-testid="tab-review-pacing__preset"]').exists()).toBe(true)
  })

  test('the preset select is bound to selected_preset_value from usePacingFields [obligation]', () => {
    const { wrapper } = makeWrapper({ pacingOverrides: { preset_id: null } })
    expect(wrapper.find('[data-testid="tab-review-pacing__preset"]').element.value).toBe('1')
  })

  test('changing the preset select writes to pacing.preset_id [obligation]', async () => {
    mockPresetsData.value = [SYSTEM_PRESET, { id: 2, name: 'Aggressive', is_system: false }]
    const { wrapper, pacing } = makeWrapper()

    await wrapper.find('[data-testid="tab-review-pacing__preset"]').setValue('2')

    expect(pacing.preset_id).toBe(2)
  })
})

describe('AdvancedPacingModal — dialog-card close [obligation]', () => {
  test('the dialog-card close event (backdrop/esc dismiss) calls the close prop [obligation]', async () => {
    const { wrapper, close } = makeWrapper()
    await wrapper.findComponent(DialogCard).vm.$emit('close')
    expect(close).toHaveBeenCalledOnce()
  })
})

describe('AdvancedPacingModal — labeled sections [obligation]', () => {
  test('renders a Daily Limits section wrapping daily-limits.vue [obligation]', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.findComponent(DailyLimits).exists()).toBe(true)
  })

  test('renders a Scheduling Algorithm section with retention/learning/relearning rows, each in a tooltip-row [obligation]', () => {
    const { wrapper } = makeWrapper()
    const rows = wrapper.findAllComponents(TooltipRow)
    const testids = rows.map((row) => row.attributes('data-testid'))

    expect(testids).toContain('tab-review-pacing__retention')
    expect(testids).toContain('tab-review-pacing__learning-steps')
    expect(testids).toContain('tab-review-pacing__relearning-steps')
  })

  test('bumping the retention spinbox writes to pacing.desired_retention_override', async () => {
    const { wrapper, pacing } = makeWrapper({ deckOverrides: { desired_retention: 90 } })
    await wrapper
      .find('[data-testid="tab-review-pacing__retention"] [data-testid="ui-spinbox__increment"]')
      .trigger('click')
    expect(pacing.desired_retention_override).toBe(91)
  })

  test('changing the learning-steps select writes to pacing.learning_steps_override', async () => {
    const { wrapper, pacing } = makeWrapper({ deckOverrides: { learning_steps: ['1m', '10m'] } })
    await wrapper
      .find('[data-testid="tab-review-pacing__learning-steps"] [data-testid="ui-select-menu"]')
      .setValue('1d')
    expect(pacing.learning_steps_override).toEqual(['1d'])
  })

  test('changing the relearning-steps select writes to pacing.relearning_steps_override', async () => {
    const { wrapper, pacing } = makeWrapper({ deckOverrides: { relearning_steps: ['10m'] } })
    await wrapper
      .find('[data-testid="tab-review-pacing__relearning-steps"] [data-testid="ui-select-menu"]')
      .setValue('1d')
    expect(pacing.relearning_steps_override).toEqual(['1d'])
  })

  test('bumping the max-reviews row (inside daily-limits) writes to pacing.max_reviews_per_day_override', async () => {
    const { wrapper, pacing } = makeWrapper({ deckOverrides: { max_reviews_per_day: 50 } })
    await wrapper
      .find('[data-testid="tab-review-pacing__max-reviews"] [data-testid="ui-spinbox__increment"]')
      .trigger('click')
    expect(pacing.has_max_reviews_override).toBe(true)
    expect(pacing.max_reviews_per_day_override).toBe(51)
  })

  test('bumping the max-new row (inside daily-limits) writes to pacing.max_new_per_day_override', async () => {
    const { wrapper, pacing } = makeWrapper({ deckOverrides: { max_new_per_day: 10 } })
    await wrapper
      .find('[data-testid="tab-review-pacing__max-new"] [data-testid="ui-spinbox__increment"]')
      .trigger('click')
    expect(pacing.has_max_new_override).toBe(true)
    expect(pacing.max_new_per_day_override).toBe(11)
  })
})

describe('AdvancedPacingModal — Done button [obligation]', () => {
  test('calls the close prop function directly, not a save/persist call [obligation]', async () => {
    const { wrapper, close } = makeWrapper()
    await wrapper.find('[data-testid="advanced-pacing-modal__done"]').trigger('click')
    expect(close).toHaveBeenCalledOnce()
  })
})

describe('AdvancedPacingModal — sfx [obligation]', () => {
  test('plays wooden_chime_ring on mount [obligation]', () => {
    makeWrapper()
    expect(mockEmitSfx).toHaveBeenCalledWith('wooden_chime_ring')
  })

  test('plays pop_up_close on unmount [obligation]', () => {
    const { wrapper } = makeWrapper()
    mockEmitSfx.mockClear()
    wrapper.unmount()
    expect(mockEmitSfx).toHaveBeenCalledWith('pop_up_close')
  })
})
