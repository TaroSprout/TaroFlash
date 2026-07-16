import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, reactive, useAttrs } from 'vue'
import { deckEditorKey } from '@/composables/deck/editor'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockPresetsData, mockOpen } = vi.hoisted(() => ({
  mockPresetsData: { value: [] },
  mockOpen: vi.fn()
}))

vi.mock('@/api/review-pacing', () => ({
  usePresetsQuery: () => ({ data: mockPresetsData })
}))

vi.mock('@/composables/modal', async (importOriginal) => ({
  ...(await importOriginal()),
  useModal: vi.fn(() => ({ open: mockOpen }))
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
  props: {
    value: { type: Number, required: true },
    min: Number,
    max: Number,
    pill_label: { type: String, default: undefined },
    pill_active: { type: Boolean, default: false }
  },
  emits: ['update:value', 'update:pill_active'],
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

const SYSTEM_PRESET = { id: 1, name: 'Recommended', is_system: true }
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
  mockOpen.mockReset()
})

describe('PacingSection — rendering', () => {
  test('renders the preset select and both daily-limit rows', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="tab-review-pacing__preset"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tab-review-pacing__max-reviews"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tab-review-pacing__max-new"]').exists()).toBe(true)
  })

  test('does not render the retention/learning-steps/relearning-steps rows (moved to the advanced modal)', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="tab-review-pacing__retention"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="tab-review-pacing__learning-steps"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="tab-review-pacing__relearning-steps"]').exists()).toBe(false)
  })

  test('does not render a reset-overrides button (moved out, not yet rebuilt)', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="tab-review-pacing__reset-overrides"]').exists()).toBe(false)
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

describe('PacingSection — Advanced button opens the modal [obligation]', () => {
  test('pressing "Advanced" opens the advanced pacing modal with the deck and pacing state [obligation]', async () => {
    const { wrapper, deck, pacing } = makeWrapper()

    await wrapper.find('[data-testid="tab-review-pacing__advanced"]').trigger('click')

    expect(mockOpen).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ props: { deck, pacing }, backdrop: true, mode: 'popup' })
    )
  })
})
