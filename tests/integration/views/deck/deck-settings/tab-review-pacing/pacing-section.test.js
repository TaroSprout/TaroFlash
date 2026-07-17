import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, reactive, useAttrs } from 'vue'
import { deckEditorKey } from '@/composables/deck/editor'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockPresetsData, mockEmitSfx } = vi.hoisted(() => ({
  mockPresetsData: { value: [] },
  mockEmitSfx: vi.fn()
}))

vi.mock('@/api/review-pacing', () => ({
  usePresetsQuery: () => ({ data: mockPresetsData })
}))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

// accordionEnter/Leave call gsap under the hood via scheduling-section's real
// component tree — call done() synchronously so the transition completes.
vi.mock('@/utils/animations/accordion', () => ({
  accordionEnter: (_el, done) => done(),
  accordionLeave: (_el, done) => done()
}))

// scheduling-section.vue has its own dedicated test file — stub it here so
// this suite only exercises the daily-limit rows + accordion toggle that
// live directly in pacing-section.vue.
vi.mock('@/views/deck/deck-settings/tab-review-pacing/scheduling-section.vue', async () => {
  const { defineComponent: dc, h: hh } = await import('vue')
  return {
    default: dc({
      name: 'SchedulingSection',
      setup: () => () => hh('div', { 'data-testid': 'tab-review-pacing__advanced-panel' })
    })
  }
})

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
  max_reviews_per_day: 50,
  max_new_per_day: 10
}
const CUSTOM_PRESET = { id: 2, name: 'Aggressive', is_system: false }

function makeWrapper({ deck: deckOverrides = {}, pacingOverrides = {} } = {}) {
  const deck = {
    id: 1,
    card_count: undefined,
    max_reviews_per_day: 50,
    max_new_per_day: 10,
    ...deckOverrides
  }
  const pacing = reactive({
    preset_id: null,
    has_max_reviews_override: false,
    max_reviews_per_day_override: null,
    has_max_new_override: false,
    max_new_per_day_override: null,
    desired_retention_override: null,
    learning_steps_override: null,
    relearning_steps_override: null,
    leech_threshold_override: null,
    has_max_interval_override: false,
    max_interval_override: null,
    ...pacingOverrides
  })
  const editor = { deck, pacing }
  const wrapper = mount(PacingSection, {
    global: {
      provide: { [deckEditorKey]: editor },
      stubs: {
        UiSelectMenu: SelectMenuStub,
        UiSpinbox: SpinboxStub,
        UiButton: ButtonStub
      },
      mocks: { $t: (k) => k }
    }
  })
  return { wrapper, deck, pacing }
}

beforeEach(() => {
  mockPresetsData.value = [SYSTEM_PRESET, CUSTOM_PRESET]
  mockEmitSfx.mockClear()
})

describe('PacingSection — rendering', () => {
  test('renders the preset select and both daily-limit rows', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="tab-review-pacing__preset"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tab-review-pacing__max-reviews"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tab-review-pacing__max-new"]').exists()).toBe(true)
  })

  test('does not render the retention/learning-steps/relearning-steps rows (they live in scheduling-section, gated behind the accordion)', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="tab-review-pacing__retention"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="tab-review-pacing__learning-steps"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="tab-review-pacing__relearning-steps"]').exists()).toBe(false)
  })

  test('renders the "Advanced" button', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="tab-review-pacing__advanced"]').exists()).toBe(true)
  })

  test('the preset select renders inside the labeled-section actions slot', () => {
    const { wrapper } = makeWrapper()
    const actions = wrapper.find('[data-testid="labeled-section__actions"]')
    expect(actions.find('[data-testid="tab-review-pacing__preset"]').exists()).toBe(true)
  })
})

describe('PacingSection — daily limits pin overrides [obligation]', () => {
  test('bumping the max-reviews spinbox writes to pacing.max_reviews_per_day_override [obligation]', async () => {
    const { wrapper, pacing } = makeWrapper({ deck: { max_reviews_per_day: 50 } })

    await wrapper
      .find('[data-testid="tab-review-pacing__max-reviews"] [data-testid="ui-spinbox__increment"]')
      .trigger('click')

    expect(pacing.has_max_reviews_override).toBe(true)
    expect(pacing.max_reviews_per_day_override).toBe(51)
  })

  test('bumping the max-new spinbox writes to pacing.max_new_per_day_override [obligation]', async () => {
    const { wrapper, pacing } = makeWrapper({ deck: { max_new_per_day: 10 } })

    await wrapper
      .find('[data-testid="tab-review-pacing__max-new"] [data-testid="ui-spinbox__increment"]')
      .trigger('click')

    expect(pacing.has_max_new_override).toBe(true)
    expect(pacing.max_new_per_day_override).toBe(11)
  })
})

describe('PacingSection — preset selection [obligation]', () => {
  test('selecting a preset in the picker writes to pacing.preset_id [obligation]', async () => {
    const { wrapper, pacing } = makeWrapper()

    await wrapper.find('[data-testid="tab-review-pacing__preset"]').setValue('2')

    expect(pacing.preset_id).toBe(2)
  })

  test('selecting the system preset writes null (not its literal id) to pacing.preset_id [obligation]', async () => {
    const { wrapper, pacing } = makeWrapper({ pacingOverrides: { preset_id: 2 } })

    await wrapper.find('[data-testid="tab-review-pacing__preset"]').setValue('1')

    expect(pacing.preset_id).toBeNull()
  })
})

// ── Advanced accordion [obligation] ────────────────────────────────────────
// use-advanced-pacing-modal.ts was retired — the "Advanced" button now toggles
// an inline accordion (scheduling-section) instead of opening a modal.

describe('PacingSection — Advanced accordion [obligation]', () => {
  test('the scheduling-section panel is not rendered until "Advanced" is pressed [obligation]', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="tab-review-pacing__advanced-panel"]').exists()).toBe(false)
  })

  test('pressing "Advanced" reveals the scheduling-section panel [obligation]', async () => {
    const { wrapper } = makeWrapper()

    await wrapper.find('[data-testid="tab-review-pacing__advanced"]').trigger('click')
    await nextTick()

    expect(wrapper.find('[data-testid="tab-review-pacing__advanced-panel"]').exists()).toBe(true)
  })

  test('pressing "Advanced" again collapses the panel [obligation]', async () => {
    const { wrapper } = makeWrapper()
    const advanced_button = wrapper.find('[data-testid="tab-review-pacing__advanced"]')

    await advanced_button.trigger('click')
    await advanced_button.trigger('click')

    expect(wrapper.find('[data-testid="tab-review-pacing__advanced-panel"]').exists()).toBe(false)
  })

  test('opening the accordion emits the open chime, closing emits the close chime', async () => {
    const { wrapper } = makeWrapper()
    const advanced_button = wrapper.find('[data-testid="tab-review-pacing__advanced"]')

    await advanced_button.trigger('click')
    expect(mockEmitSfx).toHaveBeenLastCalledWith('wooden_chime_ring')

    await advanced_button.trigger('click')
    expect(mockEmitSfx).toHaveBeenLastCalledWith('pop_up_close')
  })

  test('does not render the advanced-override badge when no advanced field is overridden', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="tab-review-pacing__advanced-badge"]').exists()).toBe(false)
  })

  test('renders the advanced-override badge when an advanced field is overridden [obligation]', () => {
    const { wrapper } = makeWrapper({
      pacingOverrides: { desired_retention_override: 0.85 }
    })
    expect(wrapper.find('[data-testid="tab-review-pacing__advanced-badge"]').exists()).toBe(true)
  })
})
